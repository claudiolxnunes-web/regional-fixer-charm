import { motion, AnimatePresence } from "framer-motion";
import { ReactNode, useMemo } from "react";
import { useLocation } from "@tanstack/react-router";

export type TransitionType = 
  | "fade" 
  | "slide-left" 
  | "slide-right" 
  | "slide-up" 
  | "slide-down" 
  | "zoom" 
  | "flip" 
  | "parallax"
  | "none";

interface PageTransitionProps {
  children: ReactNode;
  type?: TransitionType;
  duration?: number;
  easing?: any;
}

const variants: Record<string, any> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  "slide-left": {
    initial: { x: "100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "-100%", opacity: 0 },
  },
  "slide-right": {
    initial: { x: "-100%", opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: "100%", opacity: 0 },
  },
  "slide-up": {
    initial: { y: "20px", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "-20px", opacity: 0 },
  },
  "slide-down": {
    initial: { y: "-20px", opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: "20px", opacity: 0 },
  },
  zoom: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.05, opacity: 0 },
  },
  flip: {
    initial: { rotateY: 90, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit: { rotateY: -90, opacity: 0 },
  },
  parallax: {
    initial: { x: "30%", opacity: 0, scale: 0.9 },
    animate: { x: 0, opacity: 1, scale: 1 },
    exit: { x: "-30%", opacity: 0, scale: 1.1 },
  },
  none: {
    initial: {},
    animate: {},
    exit: {},
  }
};

export function PageTransition({ 
  children, 
  type = "fade", 
  duration = 0.3,
  easing = "easeInOut"
}: PageTransitionProps) {
  const location = useLocation();
  
  const selectedVariant = useMemo(() => variants[type] || variants.fade, [type]);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={selectedVariant}
        transition={{ 
          duration, 
          ease: easing,
          // Use hardware acceleration
          type: "tween"
        }}
        className="w-full h-full flex flex-col"
        style={{ transformOrigin: "center center" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
