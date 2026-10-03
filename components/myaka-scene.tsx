import { MyakaFace } from "@/components/myaka-face";

type Scene = "nap" | "box" | "chair";

const labels = {
  nap: "Мяка свернулся на подушке и спит",
  box: "Любопытный Мяка выглядывает из открытой коробки",
  chair: "Мяка удобно устроился в кресле",
};

export function MyakaScene({ scene }: { scene: Scene }) {
  return (
    <div className={`myaka-scene scene-${scene}`} role="img" aria-label={labels[scene]}>
      <svg className="scene-props" viewBox="0 0 400 240" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          {scene === "nap" && <>
            <path d="M42 195 Q199 180 359 195 L343 225 Q192 234 47 222 Z" fill="#b8b79f" />
            <path d="M168 173 C134 145 149 110 211 108 C278 107 333 143 329 176 C323 196 261 201 220 190" fill="#f4eadb" />
            <path d="M310 166 C343 171 330 199 286 193 C259 189 253 167 277 162 C292 159 303 169 293 178" fill="none" />
            <path d="M81 67 L107 67 L81 91 L111 91 M128 40 L147 40 L129 58 L149 58" fill="none" strokeWidth="3" />
          </>}
          {scene === "box" && <>
            <path d="M72 114 L204 85 L337 121 L213 158 Z" fill="#d9c8aa" />
            <path d="M72 114 L34 78 L161 50 L204 85 M204 85 L249 52 L370 92 L337 121" fill="#e6d7bf" />
            <path d="M72 114 L82 204 L212 223 L213 158 Z" fill="#b8956d" />
            <path d="M213 158 L337 121 L321 206 L212 223 Z" fill="#ceaf89" />
            <path d="M104 146 L128 151 M282 178 L301 171" fill="none" strokeWidth="3" />
          </>}
          {scene === "chair" && <>
            <path d="M109 42 Q89 38 92 65 L111 173 L304 173 L313 63 Q317 42 294 43 Z" fill="#b8b79f" />
            <path d="M144 164 C139 133 160 114 207 115 C251 116 281 136 270 164 Z" fill="#f4eadb" stroke="none" />
            <path d="M144 164 C141 149 147 135 159 128 M247 127 C264 137 273 150 270 164" fill="none" />
            <path d="M88 130 Q69 125 72 149 L85 188 Q195 201 327 186 L337 145 Q340 124 320 128 L305 165 L105 167 Z" fill="#b8b79f" />
            <path d="M99 192 L92 225 M309 191 L316 225 M146 176 Q211 183 276 173" fill="none" />
          </>}
        </g>
      </svg>
      <div className="scene-head" aria-hidden="true">
        <MyakaFace expression={scene === "nap" ? "slow" : scene === "box" ? "curious" : "wild"} />
      </div>
    </div>
  );
}
