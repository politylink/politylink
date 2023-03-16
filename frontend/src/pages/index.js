import * as React from "react";
import HomeLayout from "../layout/homeLayout";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import VideoCard from "../components/videoCard";
import { graphql } from "gatsby";
import {
  buildClipImageUrl,
  buildClipUrl,
  buildImageUrl,
} from "../utils/urlUtils";
import SEO from "../components/seo";

const IndexPage = ({ data }) => {
  const clips = data.allClipJson.nodes;
  return (
    <HomeLayout value={0}>
      <Container maxWidth="lg" sx={{ padding: { xs: 0, sm: 1 } }}>
        <Grid container spacing={{ xs: 0, sm: 1 }}>
          {clips.map((clip) => (
            <VideoCard
              key={clip.clipId}
              clipUrl={buildClipUrl(clip.clipId)}
              imageUrl={buildClipImageUrl(clip.clipId)}
              title={clip.title}
              date={clip.video.date}
              duration={clip.video.duration}
            />
          ))}
        </Grid>
      </Container>
    </HomeLayout>
  );
};

export const query = graphql`
  query {
    allClipJson(sort: [{ video: { date: DESC } }, { clipId: DESC }]) {
      nodes {
        clipId
        title
        video {
          url
          date
          duration
        }
      }
    }
  }
`;

export default IndexPage;

export const Head = ({ location }) => {
  return (
    <SEO
      path={location.pathname}
      imageUrl={buildImageUrl("/summary_v2.png")}
      twitterCard={"summary_large_image"}
    />
  );
};
