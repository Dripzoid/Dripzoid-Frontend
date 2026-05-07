import {
  Instagram,
  Facebook,
  Youtube,
  MessageCircle,
  Sparkles,
  Wrench,
} from "lucide-react";

export default function DripzoidMaintenancePage() {
  return (
    <div className="min-h-screen overflow-hidden relative bg-white dark:bg-black transition-colors duration-500">

      {/* Background Grid */}
      <div className="absolute inset-0 opacity-40">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.08)_1px,transparent_1px)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:34px_34px]" />
      </div>

      {/* Animated Glow */}
      <div className="absolute -top-40 -left-40 w-[450px] h-[450px] bg-black/10 dark:bg-white/10 blur-3xl rounded-full animate-pulse" />
      <div className="absolute -bottom-40 -right-40 w-[450px] h-[450px] bg-black/10 dark:bg-white/10 blur-3xl rounded-full animate-pulse" />

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 opacity-20 animate-bounce">
        <Sparkles className="w-10 h-10 text-black dark:text-white" />
      </div>

      <div className="absolute bottom-20 right-10 opacity-20 animate-pulse">
        <Wrench className="w-12 h-12 text-black dark:text-white" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl rounded-[40px] border border-black/10 dark:border-white/10 bg-white/70 dark:bg-white/[0.03] backdrop-blur-3xl shadow-[0_20px_80px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_80px_rgba(255,255,255,0.05)] p-10 md:p-16 text-center overflow-hidden relative">

          {/* Inner Glow */}
          <div className="absolute inset-0 rounded-[40px] bg-gradient-to-br from-black/[0.02] to-transparent dark:from-white/[0.03] pointer-events-none" />

          {/* Logo */}
          <div className="relative flex justify-center mb-12">

            {/* Light Mode Logo */}
            <img
              src="//logo-light.png"
              alt="Dripzoid"
              className="h-24 md:h-36 lg:h-44 block dark:hidden object-contain animate-pulse"
            />

            {/* Dark Mode Logo */}
            <img
              src="logo-dark.png"
              alt="Dripzoid"
              className="h-24 md:h-36 lg:h-44 hidden dark:block object-contain animate-pulse"
            />
          </div>

          

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-black tracking-tight text-black dark:text-white mb-6 leading-tight">
            IS UNDER
            <span className="block mt-2 text-neutral-500 dark:text-neutral-400">
              MAINTENANCE
            </span>
          </h1>

          {/* Description */}
          <p className="max-w-2xl mx-auto text-neutral-600 dark:text-neutral-400 text-lg md:text-2xl leading-relaxed mb-16">
            We’re currently upgrading the Dripzoid experience
            with enhanced performance, speed, and reliability.
            <br />
            We’ll be back soon.
          </p>

          {/* Status Badge */}
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full border border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] mb-8 backdrop-blur-xl shadow-lg">

            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black dark:bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-black dark:bg-white"></span>
            </span>

            <span className="text-sm md:text-base font-semibold tracking-wide text-black dark:text-white">
              Platform Enhancement In Progress
            </span>
          </div>

          {/* Social Card */}
          <div className="relative rounded-[36px] overflow-hidden border border-black/10 dark:border-white/10 bg-gradient-to-br from-black to-neutral-900 dark:from-white dark:to-neutral-200 p-10 md:p-12 shadow-2xl">

            {/* Glow */}
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-white/10 dark:bg-black/10 blur-3xl rounded-full" />
            <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-white/10 dark:bg-black/10 blur-3xl rounded-full" />

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-black text-white dark:text-black mb-4">
                Stay Tuned
              </h2>

              <p className="max-w-2xl mx-auto text-neutral-300 dark:text-neutral-700 text-base md:text-lg leading-relaxed mb-10">
                Stay connected with our social media handles
                for maintenance updates, exclusive drops,
                launches, and announcements.
              </p>

              {/* Social Icons */}
              <div className="flex justify-center flex-wrap gap-5">

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/dripzoidofficial?igsh=MWZzbzltczdnNzh2aw=="
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white/10 dark:bg-black/10 border border-white/10 dark:border-black/10 flex items-center justify-center backdrop-blur-xl hover:scale-110 hover:-translate-y-1 transition duration-300"
                >
                  <Instagram className="w-8 h-8 md:w-9 md:h-9 text-white dark:text-black group-hover:rotate-6 transition duration-300" />
                </a>

                {/* WhatsApp */}
                <a
                  href="https://wa.me/message/NSIW5WOQRBDFG1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white/10 dark:bg-black/10 border border-white/10 dark:border-black/10 flex items-center justify-center backdrop-blur-xl hover:scale-110 hover:-translate-y-1 transition duration-300"
                >
                  <MessageCircle className="w-8 h-8 md:w-9 md:h-9 text-white dark:text-black group-hover:-rotate-6 transition duration-300" />
                </a>

                {/* Facebook */}
                <a
                  href="https://www.facebook.com/share/1Begozxt9S/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white/10 dark:bg-black/10 border border-white/10 dark:border-black/10 flex items-center justify-center backdrop-blur-xl hover:scale-110 hover:-translate-y-1 transition duration-300"
                >
                  <Facebook className="w-8 h-8 md:w-9 md:h-9 text-white dark:text-black group-hover:rotate-6 transition duration-300" />
                </a>

                {/* YouTube */}
                <a
                  href="https://youtube.com/@dripzoidofficial?si=z_oN9DBw7X-YzPGp"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-16 h-16 md:w-20 md:h-20 rounded-3xl bg-white/10 dark:bg-black/10 border border-white/10 dark:border-black/10 flex items-center justify-center backdrop-blur-xl hover:scale-110 hover:-translate-y-1 transition duration-300"
                >
                  <Youtube className="w-8 h-8 md:w-9 md:h-9 text-white dark:text-black group-hover:-rotate-6 transition duration-300" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Decorative Line */}
          <div className="mt-14 flex justify-center">
            <div className="w-52 h-[2px] bg-gradient-to-r from-transparent via-black/30 dark:via-white/30 to-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}
