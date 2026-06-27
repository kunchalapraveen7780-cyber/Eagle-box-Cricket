import { useEffect } from "react";
import { motion, useMotionValue, useTransform, animate, useAnimation } from "framer-motion";

export default function PremiumLoader() {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => `${Math.round(latest)}%`);
  const wrapperControls = useAnimation();
  const ballRotateControls = useAnimation();
  const glowControls = useAnimation();
  const trailControls = useAnimation();

  useEffect(() => {
    // Percentage counts 0 -> 100% over 1.4 seconds
    animate(count, 100, { duration: 1.4, ease: "easeOut" });

    const runSequence = async () => {
      // 1. Enter from left (0s to 1.4s)
      trailControls.start({ opacity: 1, width: "250px", transition: { duration: 0.1 } });
      ballRotateControls.start({ rotate: [0, 1440], transition: { duration: 1.4, ease: "easeOut" } });
      
      await wrapperControls.start({
        x: ["-100vw", "0vw"],
        y: 0,
        scale: 1,
        transition: { duration: 1.4, ease: "easeOut" }
      });

      // 2. Pause and Glow (1.4s to 1.6s)
      trailControls.start({ opacity: 0, width: "0px", transition: { duration: 0.1 } });
      glowControls.start({
        opacity: [0, 1, 0],
        scale: [1, 2, 2.5],
        transition: { duration: 0.2, ease: "easeOut" }
      });
      await new Promise(resolve => setTimeout(resolve, 200)); // wait exactly 0.2s

      // 3. Accelerate towards "Book a Slot" button (1.6s to 2.0s)
      trailControls.start({ opacity: 1, width: "150px", right: "50%", transition: { duration: 0.1 } });
      ballRotateControls.start({ rotate: [1440, 2160], transition: { duration: 0.4, ease: "easeIn" } });
      await wrapperControls.start({
        y: 150, // Moving down towards where the button will appear
        scale: 0.2,
        opacity: 0,
        transition: { duration: 0.4, ease: "easeIn" }
      });
    };

    runSequence();
  }, [count, wrapperControls, ballRotateControls, glowControls, trailControls]);

  return (
    <motion.div
      exit={{ opacity: 0, transition: { duration: 0.2, ease: "easeInOut" } }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white overflow-hidden"
    >
      <motion.div
        animate={wrapperControls}
        initial={{ x: "-100vw", y: 0, scale: 1 }}
        className="relative flex flex-col items-center justify-center z-20"
      >
        {/* Speed Trail */}
        <motion.div
          animate={trailControls}
          initial={{ opacity: 0, width: "0px" }}
          className="absolute top-10 right-1/2 -translate-y-1/2 h-[20px] bg-gradient-to-l from-red-600 to-transparent blur-[2px] rounded-full origin-right"
          style={{ zIndex: -1 }}
        />

        {/* The Cricket Ball */}
        <motion.div
          animate={ballRotateControls}
          initial={{ rotate: 0 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-[#EF5350] via-[#C62828] to-[#8E0000] shadow-[inset_-4px_-4px_10px_rgba(0,0,0,0.6),_0_10px_15px_rgba(0,0,0,0.2)] flex items-center justify-center border border-[#B71C1C] overflow-hidden relative"
        >
          {/* White Seam */}
          <div className="absolute w-[110%] h-4 border-t-[3px] border-b-[3px] border-white/90 rotate-45 border-dashed rounded-[50%]"></div>
          <div className="absolute w-[110%] h-4 border-t-[3px] border-b-[3px] border-white/90 -rotate-45 border-dashed rounded-[50%]"></div>
        </motion.div>

        {/* Impact Green Glow Ring */}
        <motion.div
          animate={glowControls}
          initial={{ opacity: 0, scale: 1 }}
          className="absolute top-10 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-4 border-[#22C55E] bg-[#22C55E]/20 shadow-[0_0_30px_#22C55E]"
          style={{ zIndex: 10 }}
        />

        {/* Percentage text moving with the ball */}
        <motion.h1 
          className="text-4xl font-black text-gray-900 font-mono tracking-tighter mt-6"
        >
          {rounded}
        </motion.h1>
      </motion.div>
    </motion.div>
  );
}
