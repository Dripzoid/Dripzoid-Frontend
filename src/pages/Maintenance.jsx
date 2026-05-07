import {
  Instagram,
  MessageCircle,
  Facebook,
  Youtube,
} from "lucide-react";

export default function DripzoidMaintenancePage() {
  return (
    <div className="min-h-screen bg-white dark:bg-black transition-colors duration-500 overflow-hidden relative">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      {/* Glow Effects */}
      <div className="absolute top-0 left-0 w-[300px] h-[300px] bg-black/5 dark:bg-white/5 blur-3xl rounded-full" />
      <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-black/5 dark:bg-white/5 blur-3xl rounded-full" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-20">
        {/* Main Content */}
        <div className="w-full max-w-3xl rounded-[40px] border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-2xl shadow-2xl p-10 md:p-16 text-center">
          
          {/* Logo */}
          <div className="flex justify-center mb-10">
            <>
              {/* Light Theme Logo */}
              <img
                src="/logo-dark.png"
                alt="Dripzoid"
                className="h-16 md:h-20 dark:hidden object-contain"
              />

              {/* Dark Theme Logo */}
              <img
                src="/logo-light.png"
                alt="Dripzoid"
                className="h-16 md:h-20 hidden dark:block object-contain"
              />
            </>
          </div>

          {/* Maintenance Text */}
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-black dark:text-white mb-4">
            IS UNDER MAINTENANCE
          </h1>

          <p className="text-neutral-600 dark:text-neutral-400 text-lg md:text-xl mb-14">
            We’ll be back soon.
          </p>

          {/* Social Media */}
          <div className="rounded-3xl p-8 bg-gradient-to-r from-black to-neutral-800 dark:from-white dark:to-neutral-200 text-white dark:text-black shadow-2xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-4 text-center">
              Stay Connected with Dripzoid
            </h2>

            <p className="text-center text-neutral-200 dark:text-neutral-700 mb-8 max-w-2xl mx-auto">
              Follow us on social platforms for latest drops,
              exclusive offers, and community updates.
            </p>

            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="https://www.instagram.com/dripzoidofficial?igsh=MWZzbzltczdnNzh2aw=="
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black dark:bg-black dark:text-white font-semibold hover:scale-105 transition duration-300"
              >
                <Instagram className="w-5 h-5" />
                Instagram
              </a>

              <a
                href="https://wa.me/message/NSIW5WOQRBDFG1"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black dark:bg-black dark:text-white font-semibold hover:scale-105 transition duration-300"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </a>

              <a
                href="https://www.facebook.com/share/1Begozxt9S/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black dark:bg-black dark:text-white font-semibold hover:scale-105 transition duration-300"
              >
                <Facebook className="w-5 h-5" />
                Facebook
              </a>

              <a
                href="https://youtube.com/@dripzoidofficial?si=z_oN9DBw7X-YzPGp"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black dark:bg-black dark:text-white font-semibold hover:scale-105 transition duration-300"
              >
                <Youtube className="w-5 h-5" />
                YouTube
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
