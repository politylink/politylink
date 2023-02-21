import React, {PureComponent} from 'react';
import TranscriptUtterance from "./transcriptUtterance";
import * as styles from './transcript.module.css';

class Transcript extends PureComponent {
    render() {
        return (
            <div className={styles.container} onScroll={this.props.onScroll}>
                {this.props.utterances.map(({start, end, words}, i) => (
                    <TranscriptUtterance
                        key={i}
                        start={start}
                        end={end}
                        words={words}
                        updateTime={this.props.updateTime}
                    />
                ))}
            </div>
        );
    }
}

export default Transcript;
