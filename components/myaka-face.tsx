"use client";

import faceData from "@/lib/myaka-face.json";
import { memo } from "react";

export type MyakaExpression = keyof typeof faceData.expressions;

export const MyakaFace = memo(function MyakaFace({ expression = "slow", className = "" }: { expression?: MyakaExpression; className?: string }) {
  return (
    <svg
      className={`myaka-face ${className}`}
      viewBox="60 349 1158 598"
      width="1158"
      height="598"
      role="img"
      aria-label={faceData.expressions[expression].label}
      data-expression={expression}
    >
      <path d={faceData.outline} fill="currentColor" fillRule="evenodd" />
      {Object.entries(faceData.expressions).map(([key, state]) => (
        <g key={key} className={`face-expression ${expression === key ? "active" : ""}`} aria-hidden="true">
          {state.features.map((feature, index) => (
            <path key={index} d={feature.d} fill={feature.fill} stroke={"stroke" in feature ? feature.stroke : undefined}
              strokeWidth={"strokeWidth" in feature ? feature.strokeWidth : undefined}
              fillRule="evenodd" strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </g>
      ))}
    </svg>
  );
});
