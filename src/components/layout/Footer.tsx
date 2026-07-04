import { Link } from 'react-router-dom';

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

const headingCls =
  'text-lg font-bold text-apple-text dark:text-apple-light pb-2.5 mb-4 border-b border-gray-200 dark:border-slate-800 transition-colors';
const linkCls =
  'text-sm text-apple-subtext dark:text-slate-400 hover:text-[#c20f24] dark:hover:text-red-400 transition-colors';

export function Footer() {
  return (
    <footer
      id="contact"
      className="bg-white dark:bg-slate-950 border-t border-gray-100 dark:border-slate-800 transition-colors scroll-mt-20"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1fr] gap-12 lg:gap-10">

          {/* Brand block — photo, name, tagline */}
          <div className="flex flex-col items-center text-center">
            <div className="w-28 h-28 rounded-full overflow-hidden bg-[radial-gradient(circle_at_32%_22%,#e3142b_0%,#a50f24_55%,#5e0813_100%)] shadow-[0_12px_32px_rgba(194,15,36,0.28)] mb-4">
              <img
                src="/images/pasindu-hero.png"
                alt="Pasindu Dissanayake"
                className="w-full h-full object-cover object-top scale-110"
                draggable={false}
              />
            </div>
            <p className="font-extrabold text-xl uppercase tracking-tight text-apple-text dark:text-apple-light transition-colors">
              Pasindu Dissanayake
            </p>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.3em] uppercase text-[#c20f24]">
              Advanced Level ICT
            </p>
            <p className="mt-4 text-sm text-apple-subtext dark:text-slate-400 leading-relaxed max-w-[280px] transition-colors">
              🔥 ඉගෙනගන්න, ඉගෙනගත්ත කෙනෙක්ගෙන් අහලා බලන්න..! 👊
            </p>
            <p className="mt-1.5 text-xs text-apple-subtext/70 dark:text-slate-500 transition-colors">
              - පසිඳු දිසානායක -
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className={headingCls}>Quick Links</h3>
            <ul className="space-y-3">
              <li><a href="/#promos" className={linkCls}>Promotions</a></li>
              <li><a href="/#reviews" className={linkCls}>Reviews</a></li>
              <li><a href="/#features" className={linkCls}>Why Us</a></li>
              <li><Link to="/login" className={linkCls}>Log In</Link></li>
              <li><Link to="/signup" className={linkCls}>Sign Up</Link></li>
            </ul>
          </div>

          {/* WhatsApp Channel */}
          <div>
            <h3 className={`${headingCls} flex items-center gap-2`}>
              <span className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
              </span>
              WhatsApp
            </h3>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://whatsapp.com/channel/0029Vb6zVpy4tRrtEpCZ7n1i"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkCls}
                >
                  Official WhatsApp Channel
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/94719735601"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkCls}
                >
                  පන්ති පිළිබඳ විමසීම්
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Us */}
          <div>
            <h3 className={headingCls}>Contact Us</h3>
            <ul className="space-y-3">
              <li>
                <a href="https://wa.me/94719735601" target="_blank" rel="noopener noreferrer" className={`${linkCls} flex items-center gap-2.5`}>
                  <span className="w-6 h-6 rounded-full bg-[#25D366] flex items-center justify-center shrink-0">
                    <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
                  </span>
                  071 973 5601
                </a>
              </li>
              <li>
                <a href="https://facebook.com/" target="_blank" rel="noopener noreferrer" className={`${linkCls} flex items-center gap-2.5`}>
                  <span className="w-6 h-6 rounded-full bg-[#1877F2] flex items-center justify-center shrink-0">
                    <FacebookIcon className="w-3.5 h-3.5 text-white" />
                  </span>
                  Pasindu Dissanayake
                </a>
              </li>
              <li>
                <a href="https://youtube.com/" target="_blank" rel="noopener noreferrer" className={`${linkCls} flex items-center gap-2.5`}>
                  <span className="w-6 h-6 rounded-full bg-[#FF0000] flex items-center justify-center shrink-0">
                    <YouTubeIcon className="w-3.5 h-3.5 text-white" />
                  </span>
                  Pasindu Dissanayake
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="border-t border-gray-100 dark:border-slate-800 transition-colors">
        <p className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 text-center text-gray-500 dark:text-slate-500 text-xs">
          © {new Date().getFullYear()} Udayana ICT · Pasindu Dissanayake. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
