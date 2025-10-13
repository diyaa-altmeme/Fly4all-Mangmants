
"use client";

import { Rocket } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Preloader() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <motion.div
                animate={{
                    y: [0, -10, 0],
                    rotate: [0, 5, -5, 0],
                }}
                transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                }}
            >
                <Rocket className="h-16 w-16 text-primary" />
            </motion.div>
        </div>
    );
}
