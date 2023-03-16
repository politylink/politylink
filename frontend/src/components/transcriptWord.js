import React, { PureComponent } from "react";

class TranscriptWord extends PureComponent {
  render() {
    return (
      <span
        data-start={this.props.start}
        data-end={this.props.end}
        onClick={() => this.props.updateTime(this.props.start)}
      >
        {this.props.text}
      </span>
    );
  }
}

export default TranscriptWord;
