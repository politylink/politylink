from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List

import pandas as pd

from mylib.audio.transcript.loop import TranscriptLoopDetector
from mylib.utils.path import PathHelper
from mylib.workflow.models import BaseOperator, PythonOperator
from mylib.workflow.scheduler import JobScheduler
from mylib.workflow.transcribe import AudioSplitJob, WhisperJob, MergeWhisperJob


@dataclass
class PatchRequest:
    video_id: int
    datetime: datetime


class PatchJobScheduler(JobScheduler):

    def __init__(self, path_helper: PathHelper, **kwargs):
        self.path_helper = path_helper
        super().__init__(**kwargs)

    def schedule_batch(self, requests: List[PatchRequest]) -> List[BaseOperator]:
        jobs = []
        requests = sorted(requests, key=lambda x: x.datetime, reverse=True)  # prioritize the latest when tie-break
        for job_input in requests:
            jobs += self.schedule(job_input)
        jobs = sorted(jobs, key=lambda x: x.context.priority, reverse=True)
        return jobs

    def schedule(self, request: PatchRequest) -> List[BaseOperator]:
        work_dir = self.path_helper.get_work_dir(request.video_id)
        data_dir = work_dir / 'data'
        log_dir = work_dir / 'log'
        mp3_fp = data_dir / 'audio.mp3'
        transcript_fp = data_dir / 'transcript.csv'
        patch_fp = data_dir / 'patch.csv'
        transcript_patch_fp = data_dir / 'transcript_patch.csv'
        transcript_merged_fp = data_dir / 'transcript_merged.csv'

        jobs = [
            DefinePatchJob(transcript_fp, patch_fp)
        ]

        result_fps = []
        if patch_fp.exists():
            patch_df = pd.read_csv(patch_fp)

            for _, row in patch_df.iterrows():
                wav_fp = data_dir / '{}.wav'.format(row['id'])
                jobs.append(
                    AudioSplitJob(audio_fp=mp3_fp, start_sec=row['start_sec'], end_sec=row['end_sec'], out_fp=wav_fp))
                log_fp = log_dir / 'whisper_{}.log'.format(row['id'])
                jobs.append(WhisperJob(wav_fp=wav_fp, log_fp=log_fp))
                result_fps.append(WhisperJob.get_result_fp(wav_fp))

        if result_fps:
            jobs.append(MergeWhisperJob(vad_fp=patch_fp, result_fps=result_fps, out_fp=transcript_patch_fp))
            jobs.append(ApplyPatchJob(transcript_fp=transcript_fp, patch_fp=patch_fp,
                                      transcript_patch_fp=transcript_patch_fp, out_fp=transcript_merged_fp))

        jobs = self.filter_jobs(jobs)
        if not self.force_execute:  # do not sort to avoid running downstream jobs with previous outputs
            jobs = self.sort_jobs(jobs)
        return jobs


class DefinePatchJob(PythonOperator):
    def __init__(self, transcript_fp: Path, out_fp: Path):
        context = self.init_context(locals())

        def main():
            transcript_df = pd.read_csv(transcript_fp)
            loop_df = TranscriptLoopDetector().detect(transcript_df, duration_sec_thresh=30)
            loop_df['id'] = [f'p{i}' for i in range(1, len(loop_df) + 1)]
            loop_df = loop_df[['id', 'start_sec', 'end_sec', 'text']]
            loop_df.to_csv(out_fp, index=False)

        context.in_fps = [transcript_fp]
        context.out_fps = [out_fp]
        super().__init__(main, context=context)


class ApplyPatchJob(PythonOperator):
    def __init__(self, transcript_fp: Path, patch_fp: Path, transcript_patch_fp: Path, out_fp: Path):
        context = self.init_context(locals())

        def main():
            transcript_df = pd.read_csv(transcript_fp)
            patch_df = pd.read_csv(patch_fp)
            transcript_patch_df = pd.read_csv(transcript_patch_fp)

            transcript_masked_df = transcript_df
            for start_sec, end_sec in zip(patch_df['start_sec'], patch_df['end_sec']):
                mask = (transcript_df['start_ms'] >= start_sec * 1000) & (transcript_df['end_ms'] <= end_sec * 1000)
                transcript_masked_df = transcript_df[~mask]

            out_df = pd.concat([transcript_masked_df, transcript_patch_df])
            out_df = out_df.sort_values(by='start_ms')
            out_df['start_ms'] = out_df['start_ms'].astype(int)
            out_df['end_ms'] = out_df['end_ms'].astype(int)
            out_df = out_df[['start_ms', 'end_ms', 'text']]
            out_df.to_csv(out_fp, index=False)

        context.in_fps = [transcript_fp, patch_fp, transcript_patch_fp]
        context.out_fps = [out_fp]
        super().__init__(main, context=context)
