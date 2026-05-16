"use client"

import { cn } from "@repo/utils"
import { useEffect, useId, useState } from "react"
import { motion } from "framer-motion"

interface SparklesCoreProps {
  id?: string
  className?: string
  background?: string
  minSize?: number
  maxSize?: number
  particleDensity?: number
  particleColor?: string
  particleSpeed?: number
}

export function SparklesCore({
  id,
  className,
  background = "transparent",
  minSize = 0.4,
  maxSize = 1,
  particleDensity = 100,
  particleColor = "#FFF",
  particleSpeed = 1,
}: SparklesCoreProps) {
  const [particles, setParticles] = useState<Array<{
    id: number
    x: number
    y: number
    size: number
    duration: number
    delay: number
  }>>([])
  const generatedId = useId()

  useEffect(() => {
    const newParticles = Array.from({ length: particleDensity }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * (maxSize - minSize) + minSize,
      duration: (Math.random() * 2 + 1) / particleSpeed,
      delay: Math.random() * 2,
    }))
    setParticles(newParticles)
  }, [particleDensity, minSize, maxSize, particleSpeed])

  return (
    <div
      className={cn("relative h-full w-full", className)}
      style={{ background }}
    >
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={`glow-${id || generatedId}`}>
            <feGaussianBlur stdDeviation="1" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {particles.map((particle) => (
          <motion.circle
            key={particle.id}
            cx={`${particle.x}%`}
            cy={`${particle.y}%`}
            r={particle.size}
            fill={particleColor}
            filter={`url(#glow-${id || generatedId})`}
            initial={{ opacity: 0, scale: 0 }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>
    </div>
  )
}

interface SparklesProps {
  children: React.ReactNode
  className?: string
  sparklesClassName?: string
}

export function Sparkles({ children, className, sparklesClassName }: SparklesProps) {
  return (
    <div className={cn("relative", className)}>
      <SparklesCore
        className={cn("absolute inset-0 -z-10", sparklesClassName)}
        particleDensity={50}
        particleColor="#7C3AED"
      />
      {children}
    </div>
  )
}
