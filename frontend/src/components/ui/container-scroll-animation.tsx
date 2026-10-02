'use client';

import React, { useRef } from 'react';
import { useScroll, useTransform, motion, type MotionValue } from 'framer-motion';

export const ContainerScroll = ({
  titleComponent,
  children,
}: {
  titleComponent: string | React.ReactNode;
  children: React.ReactNode;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
  });
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.85, 0.95] : [1, 1];
  };

  const rotate = useTransform(scrollYProgress, [0, 1], [0, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], scaleDimensions());
  const translate = useTransform(scrollYProgress, [0, 1], [0, -60]);

  return (
    <div
      className="h-auto flex items-start justify-center relative px-2 pt-2 pb-2 md:px-12 md:pt-3"
      ref={containerRef}
    >
      <div
        className="pt-1 pb-6 md:pt-2 md:pb-8 w-full relative"
        style={{
          perspective: '1000px',
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({
  translate,
  titleComponent,
}: {
  translate: MotionValue<number>;
  titleComponent: string | React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="max-w-5xl mx-auto text-center relative z-20"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  children,
}: {
  rotate: MotionValue<number>;
  scale: MotionValue<number>;
  children: React.ReactNode;
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        transformOrigin: 'center top',
        boxShadow:
          '0 0 #0f2f2b1a, 0 9px 20px #0f2f2b14, 0 37px 37px #0f2f2b10, 0 84px 50px #0f2f2b0a, 0 149px 60px #0f2f2b05',
      }}
      className="max-w-6xl xl:max-w-7xl mt-2 md:mt-3 mx-auto h-[22rem] sm:h-[28rem] md:h-[34rem] w-full border border-slate-200/90 p-1.5 md:p-2 bg-white rounded-[24px] md:rounded-[30px] shadow-2xl relative z-0"
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-slate-50 md:rounded-2xl">
        {children}
      </div>
    </motion.div>
  );
};
