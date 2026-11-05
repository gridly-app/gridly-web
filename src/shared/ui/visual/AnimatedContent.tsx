// React Bits Animated Content reveal, adapted to the existing Motion runtime.
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function AnimatedContent({
	children,
	className,
	delay = 0,
	distance = 32,
}: {
	children: ReactNode;
	className?: string | undefined;
	delay?: number;
	distance?: number;
}) {
	const reduce = useReducedMotion();
	return (
		<motion.div
			className={className}
			initial={reduce ? false : { opacity: 0, y: distance }}
			whileInView={{ opacity: 1, y: 0 }}
			viewport={{ once: true, amount: 0.1 }}
			transition={{
				duration: reduce ? 0 : 0.65,
				delay: reduce ? 0 : delay,
				ease: [0.22, 1, 0.36, 1],
			}}
		>
			{children}
		</motion.div>
	);
}
