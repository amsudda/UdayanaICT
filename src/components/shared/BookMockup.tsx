/**
 * CSS-3D book mockup. Feed it a flat cover image and it renders a tilted
 * hardcover book with page block, spine, sheen and a floor shadow — the
 * same component drives the landing showcase and the admin preview.
 */
export function BookMockup({ cover, title = '', className = '' }: { cover: string; title?: string; className?: string }) {
  return (
    <div className={`group [perspective:1100px] ${className}`}>
      <div className="relative w-full aspect-[10/14] [transform-style:preserve-3d] [transform:rotateY(-26deg)] group-hover:[transform:rotateY(-14deg)_translateY(-8px)] transition-transform duration-500 ease-out">

        {/* page block — right face */}
        <div
          className="absolute right-0 top-[1.5%] bottom-[1.5%] w-[26px] origin-right [transform:rotateY(84deg)_translateX(1px)]"
          style={{ background: 'repeating-linear-gradient(90deg, #e8e6e1 0px, #ffffff 1.5px, #d9d6cf 3px)' }}
        />

        {/* back cover */}
        <div className="absolute inset-0 rounded-r-md rounded-l-sm bg-slate-300 dark:bg-slate-600 [transform:translateZ(-24px)] shadow-xl" />

        {/* spine — left face */}
        <div className="absolute left-0 top-0 bottom-0 w-[24px] origin-left [transform:rotateY(-90deg)] bg-slate-800 rounded-sm" />

        {/* front cover */}
        <div className="absolute inset-0 rounded-r-md rounded-l-sm overflow-hidden shadow-[8px_16px_36px_rgba(0,0,0,0.35)]">
          <img src={cover} alt={title} className="w-full h-full object-cover" draggable={false} />
          {/* hinge shading near the spine */}
          <div className="absolute left-0 top-0 bottom-0 w-[7%] bg-gradient-to-r from-black/35 via-black/10 to-transparent" />
          {/* glossy sheen */}
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-white/20 pointer-events-none" />
        </div>
      </div>

      {/* floor shadow */}
      <div className="mx-auto mt-7 h-4 w-[70%] rounded-[50%] bg-black/30 blur-md group-hover:w-[58%] group-hover:bg-black/20 transition-all duration-500" />
    </div>
  );
}
