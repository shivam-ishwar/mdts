import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { motion, useReducedMotion } from "framer-motion";
import "../styles/project-visual-showcase.css";

export type ProjectVisualShowcaseImage = {
    id: string;
    src: string;
    title: string;
    description: string;
};

type ProjectVisualShowcaseProps = {
    images: ProjectVisualShowcaseImage[];
};

const HEIGHT_VARIANTS = ["pvs-card--h-sm", "pvs-card--h-md", "pvs-card--h-lg"] as const;

const CARD_HOVER_TRANSITION = { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const };

function useIsMobile(breakpoint = 768) {
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia(`(max-width: ${breakpoint}px)`).matches : false
    );

    useEffect(() => {
        const media = window.matchMedia(`(max-width: ${breakpoint}px)`);
        const onChange = () => setIsMobile(media.matches);
        onChange();
        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, [breakpoint]);

    return isMobile;
}

function ShowcaseCard({
    image,
    heightClass,
}: {
    image: ProjectVisualShowcaseImage;
    heightClass: string;
}) {
    return (
        <motion.article
            className={`pvs-card ${heightClass}`}
            initial="rest"
            whileHover="hover"
            animate="rest"
        >
            <motion.div className="pvs-card-media" variants={{ rest: {}, hover: {} }} transition={CARD_HOVER_TRANSITION}>
                <motion.img
                    src={image.src}
                    alt={image.title}
                    className="pvs-card-image"
                    loading="lazy"
                    decoding="async"
                    variants={{
                        rest: { scale: 1 },
                        hover: { scale: 1.05 },
                    }}
                    transition={CARD_HOVER_TRANSITION}
                />
                <motion.div
                    className="pvs-card-overlay"
                    aria-hidden
                    variants={{
                        rest: { opacity: 0 },
                        hover: { opacity: 1 },
                    }}
                    transition={CARD_HOVER_TRANSITION}
                />
                <motion.div
                    className="pvs-card-copy"
                    variants={{
                        rest: { opacity: 0, y: 10 },
                        hover: { opacity: 1, y: 0 },
                    }}
                    transition={CARD_HOVER_TRANSITION}
                >
                    <h3>{image.title}</h3>
                    <p>{image.description}</p>
                </motion.div>
            </motion.div>
        </motion.article>
    );
}

function ShowcaseEmpty() {
    return (
        <div className="pvs-shell pvs-shell--empty">
            <h2>No images available</h2>
            <p>Upload at least one valid image to populate this showcase. Empty or incomplete items are skipped safely.</p>
        </div>
    );
}

function MobileCarousel({ images }: { images: ProjectVisualShowcaseImage[] }) {
    return (
        <div className="pvs-shell pvs-shell--mobile">
            <div className="pvs-header">
                <p className="pvs-header-note">Swipe to explore project imagery</p>
            </div>
            <div className="pvs-mobile-viewport" role="region" aria-label="Project visuals carousel">
                <div className="pvs-mobile-track">
                    {images.map((image, index) => (
                        <ShowcaseCard
                            key={image.id}
                            image={image}
                            heightClass={HEIGHT_VARIANTS[index % HEIGHT_VARIANTS.length]}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function VerticalShowcase({ images }: { images: ProjectVisualShowcaseImage[] }) {
    const prefersReducedMotion = useReducedMotion();
    const trackRef = useRef<HTMLDivElement>(null);
    const [loopHeight, setLoopHeight] = useState(0);

    const scrollDuration = Math.max(images.length * 7, 28);
    const shouldAnimate = !prefersReducedMotion && loopHeight > 0 && images.length > 0;

    useLayoutEffect(() => {
        const measure = () => {
            const track = trackRef.current;
            if (!track) return;
            const firstSet = track.querySelector<HTMLElement>('[data-loop-set="primary"]');
            if (!firstSet) return;
            setLoopHeight(firstSet.offsetHeight);
        };

        measure();
        const observer = new ResizeObserver(measure);
        if (trackRef.current) observer.observe(trackRef.current);
        return () => observer.disconnect();
    }, [images]);

    return (
        <div className="pvs-shell">
            <div className="pvs-viewport">
                <div
                    ref={trackRef}
                    className={`pvs-track${shouldAnimate ? " pvs-track--animated" : ""}`}
                    style={
                        shouldAnimate
                            ? ({
                                  ["--pvs-loop-height"]: `${loopHeight}px`,
                                  ["--pvs-duration"]: `${scrollDuration}s`,
                              } as CSSProperties)
                            : undefined
                    }
                >
                    <div className="pvs-track-set" data-loop-set="primary">
                        {images.map((image, index) => (
                            <ShowcaseCard
                                key={`${image.id}-a`}
                                image={image}
                                heightClass={HEIGHT_VARIANTS[index % HEIGHT_VARIANTS.length]}
                            />
                        ))}
                    </div>
                    <div className="pvs-track-set" data-loop-set="duplicate" aria-hidden>
                        {images.map((image, index) => (
                            <ShowcaseCard
                                key={`${image.id}-b`}
                                image={image}
                                heightClass={HEIGHT_VARIANTS[index % HEIGHT_VARIANTS.length]}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

export function ProjectVisualShowcase({ images }: ProjectVisualShowcaseProps) {
    const isMobile = useIsMobile();

    if (images.length === 0) {
        return <ShowcaseEmpty />;
    }

    if (isMobile) {
        return <MobileCarousel images={images} />;
    }

    return <VerticalShowcase images={images} />;
}

export default ProjectVisualShowcase;
