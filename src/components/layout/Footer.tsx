/** WhatsApp glyph */
function WhatsAppIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

/** Facebook glyph */
function FacebookIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z" />
    </svg>
  );
}

/** YouTube glyph */
function YouTubeIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-apple-light dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-7xl mx-auto">
        {/* Red banner card */}
        <div className="relative overflow-hidden rounded-3xl px-6 py-10 sm:px-12 sm:py-12 shadow-[0_20px_50px_rgba(180,15,30,0.35)] bg-[radial-gradient(ellipse_110%_150%_at_30%_15%,#e3142b_0%,#b51022_28%,#6e0b16_58%,#2a0508_82%,#150103_100%)]">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">

            {/* LEFT: Brand lockup */}
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex flex-col items-start">
                <span className="text-white text-[0.6rem] sm:text-xs font-bold tracking-[0.28em] mb-0.5">
                  ADVANCED LEVEL
                </span>
                <span className="text-[#FFC107] font-extrabold italic text-5xl sm:text-7xl leading-[0.8] drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                  ICT
                </span>
              </div>

              {/* Divider */}
              <div className="w-[3px] h-16 sm:h-[4.5rem] bg-white/85 rounded-full" />

              <div className="flex flex-col justify-center leading-none">
                <span className="text-[#FFC107] font-extrabold italic text-2xl sm:text-4xl tracking-wide drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
                  PASINDU
                </span>
                <span className="text-white font-bold italic text-xl sm:text-3xl tracking-[0.12em] mt-1">
                  DISSANAYAKE
                </span>
              </div>
            </div>

            {/* RIGHT: Tagline + contacts */}
            <div className="flex flex-col items-center lg:items-end gap-4">
              {/* Tagline speech bubble */}
              <div className="flex items-start gap-2.5">
                <p className="text-[#FFC107] font-bold text-sm sm:text-base leading-snug text-center lg:text-right drop-shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
                  ඉගෙනගන්න, ඉගෙනගත්ත<br />
                  කෙනෙක්ගෙන් අහලා බලන්න...
                </p>
                <span className="mt-1 w-7 h-7 rounded-full bg-[#FFC107] shadow-[0_0_18px_rgba(255,193,7,0.55)] flex-shrink-0" />
              </div>

              {/* Contacts */}
              <div className="flex flex-col items-center lg:items-end gap-2.5">
                <a
                  href="https://wa.me/94719735601"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 group"
                >
                  <span className="w-7 h-7 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
                    <WhatsAppIcon className="w-4 h-4 text-white" />
                  </span>
                  <span className="text-white font-bold text-lg tracking-wide group-hover:text-[#FFC107] transition-colors">
                    071 973 5601
                  </span>
                </a>

                <a
                  href="https://facebook.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 group"
                >
                  <span className="w-7 h-7 rounded-full bg-[#1877F2] flex items-center justify-center flex-shrink-0">
                    <FacebookIcon className="w-4 h-4 text-white" />
                  </span>
                  <span className="text-white font-semibold text-sm tracking-wide group-hover:text-[#FFC107] transition-colors">
                    PASINDU DISSANAYAKE
                  </span>
                </a>

                <a
                  href="https://youtube.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 group"
                >
                  <span className="w-7 h-7 rounded-full bg-[#FF0000] flex items-center justify-center flex-shrink-0">
                    <YouTubeIcon className="w-4 h-4 text-white" />
                  </span>
                  <span className="text-white font-semibold text-sm tracking-wide group-hover:text-[#FFC107] transition-colors">
                    PASINDU DISSANAYAKE
                  </span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <p className="text-center text-gray-500 dark:text-slate-500 text-xs mt-6">
          © {new Date().getFullYear()} Udayana ICT · Pasindu Dissanayake. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
