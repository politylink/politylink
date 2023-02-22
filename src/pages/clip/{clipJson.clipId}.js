import * as React from 'react'
import {useEffect, useRef, useState} from 'react'
import {graphql} from 'gatsby'
import Transcript from "../../components/transcript";
import * as wordStyles from '../../components/transcriptWord.module.css';
import videojs from 'video.js';
import {editWordNodeClass, eqWordPosition, findActiveWordPosition, scrollToWord} from '../../utils/transcriptUtils';
import {getVideojsOptions} from '../../utils/videoUtils';
import AppBottomController from "../../components/appBottomController";
import AppTopBar from "../../components/appTopBar";
import {Chip, Toolbar, useMediaQuery, useTheme} from "@mui/material";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ShareIcon from '@mui/icons-material/Share';
import Link from "@mui/material/Link";

const ClipPage = ({data}) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isPaused, setIsPaused] = useState(true);
    const [isLeft, setIsLeft] = useState(true);

    const videoRef = useRef(null);
    const playerRef = useRef(null);
    const transcriptRef = useRef(null);
    const activeWordPositionRef = useRef(null);
    const isAutoScrollRef = useRef(true);

    useEffect(() => {
        if (!playerRef.current) {
            const videoElement = document.createElement('video-js');
            videoElement.classList.add('vjs-big-play-centered');
            videoRef.current.appendChild(videoElement);
            playerRef.current = videojs(videoElement, getVideojsOptions(data.clipJson.video.url), onReady);
        }
    }, [videoRef]);

    const onReady = () => {
        const onTimeUpdate = () => {
            const currentTime = playerRef.current.currentTime();
            const duration = playerRef.current.duration();
            const isPaused = playerRef.current.paused();
            setCurrentTime(currentTime);
            setDuration(duration);
            setIsPaused(isPaused);
            highlightTranscript(currentTime);
        };
        playerRef.current.on('timeupdate', onTimeUpdate);
        return () => playerRef.current.off('timeupdate', onTimeUpdate);
    }

    const highlightTranscript = (currentTime) => {
        let activeWordPosition = findActiveWordPosition(transcriptRef.current, currentTime);
        if (!eqWordPosition(activeWordPosition, activeWordPositionRef.current)) {
            editWordNodeClass(transcriptRef.current, activeWordPosition, wordStyles.active);
            editWordNodeClass(transcriptRef.current, activeWordPositionRef.current, wordStyles.active, false);
            activeWordPositionRef.current = activeWordPosition;
            if (isAutoScrollRef.current) {
                scrollToWord(transcriptRef.current, activeWordPositionRef.current);
            }
        }
    }

    const updateTime = (time) => {
        setCurrentTime(time);
        highlightTranscript(time);
        playerRef.current.currentTime(time);

    }

    const updateTimeWithScroll = (time) => {
        isAutoScrollRef.current = true;
        updateTime(time);
    }

    const updateTimeWithoutScroll = (time) => {
        isAutoScrollRef.current = false;
        updateTime(time);
    }

    const startPlayer = () => {
        setIsPaused(false);
        isAutoScrollRef.current = true; // TODO: trigger immediate scroll?
        highlightTranscript(currentTime);
        playerRef.current.play();
    }

    const stopPlayer = () => {
        setIsPaused(true);
        playerRef.current.pause();
    }

    return (
        <Box sx={{height: '100vh', overflowX: 'hidden'}}>
            <AppTopBar/>
            <Toolbar variant='dense'/>
            <Box sx={{
                width: isMobile ? '200%' : '100%',
                display: 'flex',
                transform: (isMobile && !isLeft) ? 'translateX(-50%)' : 'translateX(0)',
                height: isMobile ? 'calc(100vh - 250px)' : 'calc(100vh - 200px)', // TODO: fix hardcoded AppBar + BottomController height
                transitionDuration: '0.1s',
            }}>
                <Box sx={{width: '50%', maxWidth: '800px', marginX: 'auto'}}>
                    <Box ref={videoRef} sx={{maxWidth: '800px', margin: 'auto'}}></Box>
                    <Box sx={{padding: 1}}>
                        <Box sx={{display: 'flex', justifyContent: 'center'}}>
                            <Box sx={{flexGrow: 1}}>
                                <Typography variant='h5'
                                            sx={{letterSpacing: -0.05, fontWeight: 'bold', lineHeight: 1.15}}>
                                    {data.clipJson.title}
                                </Typography>
                                <Box sx={{
                                    marginTop: 0.5,
                                    display: "flex",
                                    alignItems: "center",
                                }}>
                                    <Typography variant="body1" color="text.secondary">
                                        {data.clipJson.video.date}
                                    </Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{marginLeft: 3}}>
                                        {data.clipJson.video.duration}
                                    </Typography>
                                </Box>
                            </Box>
                            <Box sx={{display: 'flex', alignItems: 'center'}}>
                                <Chip color='primary' icon={<ShareIcon/>} label={'共有'} sx={{marginX: 1}}/>
                            </Box>
                        </Box>
                        <Box sx={{marginTop: 2}}>
                            <Typography>
                                【公式サイト】
                            </Typography>
                            <Link href={data.clipJson.video.page} target="_blank" rel="noopener">
                                {data.clipJson.video.page}
                            </Link>
                        </Box>
                    </Box>
                </Box>
                <Box sx={{width: '50%'}} ref={transcriptRef}>
                    <Transcript
                        utterances={data.clipJson.transcript.utterances}
                        updateTime={updateTimeWithoutScroll}
                        onScroll={() => {
                            isAutoScrollRef.current = false;
                        }}
                    />
                </Box>
            </Box>
            <AppBottomController
                isLeft={isLeft}
                switchLeft={() => setIsLeft(true)}
                switchRight={() => setIsLeft(false)}
                currentTime={currentTime}
                duration={duration}
                isPaused={isPaused}
                updateTime={updateTimeWithScroll}
                startPlayer={startPlayer}
                stopPlayer={stopPlayer}
            />
        </Box>
    );
};

export default ClipPage;


export const query = graphql`
    query ($id: String) {
        clipJson (id: {eq:$id}) {
            clipId
            title
            video {
                url
                page
                date
                duration
            }
            transcript {
                utterances {
                    start
                    end
                    words {
                        start
                        end
                        text
                    }
                }
            }
        }   
    }
`
