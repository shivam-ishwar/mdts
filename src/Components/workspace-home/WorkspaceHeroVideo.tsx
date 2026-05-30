import { PlayCircleOutlined } from "@ant-design/icons";

type WorkspaceHeroVideoProps = {
    videoUrl?: string;
    posterUrl?: string;
    title?: string;
};

export function WorkspaceHeroVideo({
    videoUrl,
    posterUrl,
    title = "Workspace briefing",
}: WorkspaceHeroVideoProps) {
    const hasVideo = Boolean(videoUrl?.trim());

    if (hasVideo) {
        return (
            <div className="wh-hero-video">
                <span className="wh-hero-video-label">Briefing</span>
                <video
                    className="wh-hero-video-player"
                    src={videoUrl}
                    poster={posterUrl}
                    controls
                    playsInline
                    preload="metadata"
                >
                    <track kind="captions" />
                </video>
            </div>
        );
    }

    return (
        <div className="wh-hero-video wh-hero-video--placeholder" aria-label="Video placeholder">
            {/* <span className="wh-hero-video-label">Briefing</span> */}
            <div className="wh-hero-video-placeholder-inner">
                <span className="wh-hero-video-play" aria-hidden>
                    <PlayCircleOutlined />
                </span>
                {/* <p className="wh-hero-video-placeholder-title">{title}</p> */}
                <p className="wh-hero-video-placeholder-copy">
                    {/* Executive overview video will appear here once configured. */}
                </p>
            </div>
        </div>
    );
}
