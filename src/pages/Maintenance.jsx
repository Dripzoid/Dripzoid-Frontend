export default function DripzoidMaintenancePage() {
  return (
    <div className="min-h-screen bg-[#050816] text-white overflow-hidden relative flex items-center justify-center px-6 py-10">
      {/* Background Glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-[-120px] left-[-120px] w-[350px] h-[350px] bg-pink-500/20 blur-3xl rounded-full animate-pulse" />
        <div className="absolute bottom-[-150px] right-[-150px] w-[420px] h-[420px] bg-violet-500/20 blur-3xl rounded-full animate-pulse" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-5xl rounded-[40px] border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_0_80px_rgba(255,255,255,0.05)] overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-0">
          {/* Left Section */}
          <div className="p-10 md:p-14 flex flex-col justify-center">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="w-7 h-7 text-white"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 6.75V5.625a2.625 2.625 0 10-5.25 0V6.75m-3 0h8.25m-9.75 0h11.25c.621 0 1.125.504 1.125 1.125v9.75A2.625 2.625 0 0116.5 20.25h-9A2.625 2.625 0 014.875 17.625v-9.75c0-.621.504-1.125 1.125-1.125z"
                  />
                </svg>
              </div>

              <div>
                <h1 className="text-3xl font-black tracking-wide">
                  DRIPZOID
                </h1>
                <p className="text-sm text-gray-400 tracking-[4px] uppercase">
                  Fashion Elevated
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-orange-500/10 border border-orange-400/20 text-orange-300 w-fit mb-6">
              <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />
              <span className="text-sm font-medium tracking-wide">
                Scheduled Maintenance
              </span>
            </div>

            {/* Heading */}
            <h2 className="text-5xl md:text-6xl font-black leading-tight mb-6">
              We’re Upgrading
              <span className="block bg-gradient-to-r from-pink-400 via-fuchsia-400 to-violet-500 text-transparent bg-clip-text">
                Your Experience.
              </span>
            </h2>

            {/* Description */}
            <p className="text-gray-300 text-lg leading-relaxed max-w-xl mb-10">
              Dripzoid is currently undergoing scheduled maintenance to improve
              performance, speed, and shopping experience.
              <br />
              We’ll be back online shortly with something even better.
            </p>


            {/* Socials */}
            <div className="flex flex-wrap items-center gap-4">
              <a
                href="https://www.instagram.com/dripzoidofficial"
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-pink-500/10 transition-all duration-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-5 h-5 text-pink-400"
                >
                  <path d="M7.75 2C4.574 2 2 4.574 2 7.75v8.5C2 19.426 4.574 22 7.75 22h8.5C19.426 22 22 19.426 22 16.25v-8.5C22 4.574 19.426 2 16.25 2h-8.5zm0 2h8.5A3.75 3.75 0 0120 7.75v8.5A3.75 3.75 0 0116.25 20h-8.5A3.75 3.75 0 014 16.25v-8.5A3.75 3.75 0 017.75 4zm8.75 1a1.25 1.25 0 100 2.5 1.25 1.25 0 000-2.5zM12 7a5 5 0 100 10 5 5 0 000-10zm0 2a3 3 0 110 6 3 3 0 010-6z" />
                </svg>
                <span className="text-sm text-gray-200 group-hover:text-white transition">
                  Follow Updates
                </span>
              </a>

              <a
                href="https://dripzoid.com"
                className="group flex items-center gap-3 px-5 py-3 rounded-2xl border border-white/10 bg-gradient-to-r from-pink-500 to-violet-600 hover:scale-105 transition-all duration-300 shadow-lg shadow-pink-500/20"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-7.5 3L21 3m0 0h-6.75M21 3v6.75"
                  />
                </svg>
                <span className="text-sm font-semibold">Visit Website</span>
              </a>
            </div>
          </div>

          {/* Right Visual Section */}
          <div className="relative hidden lg:flex items-center justify-center min-h-[700px] border-l border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] overflow-hidden">
            {/* Floating Rings */}
            <div className="absolute w-[420px] h-[420px] rounded-full border border-white/10 animate-spin [animation-duration:30s]" />
            <div className="absolute w-[320px] h-[320px] rounded-full border border-pink-400/20 animate-spin [animation-direction:reverse] [animation-duration:24s]" />
            <div className="absolute w-[220px] h-[220px] rounded-full border border-violet-400/20 animate-spin [animation-duration:18s]" />

            {/* Core */}
            <div className="relative flex items-center justify-center">
              <div className="absolute w-52 h-52 bg-gradient-to-br from-pink-500/30 to-violet-600/30 blur-3xl rounded-full" />

              <div className="relative z-10 w-48 h-48 rounded-full bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-600 flex items-center justify-center shadow-[0_0_80px_rgba(236,72,153,0.45)]">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-20 h-20 text-white animate-pulse"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.279a1.125 1.125 0 001.017.926l1.285.094c.543.04.98.462 1.116.99l.647 2.503c.137.53-.048 1.09-.472 1.428l-1.003.8a1.125 1.125 0 00-.363 1.14l.305 1.252c.128.527-.07 1.08-.51 1.403l-2.14 1.57a1.125 1.125 0 01-1.322 0l-2.14-1.57a1.125 1.125 0 00-1.322 0l-2.14 1.57a1.125 1.125 0 01-1.322 0l-2.14-1.57a1.125 1.125 0 01-.51-1.403l.305-1.252a1.125 1.125 0 00-.363-1.14l-1.003-.8a1.125 1.125 0 01-.472-1.428l.647-2.503c.136-.528.573-.95 1.116-.99l1.285-.094a1.125 1.125 0 001.017-.926l.213-1.279z"
                  />
                </svg>
              </div>
            </div>

            {/* Floating Feature Cards */}
            <div className="absolute top-16 left-10 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-5 py-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center">
                  ⚡
                </div>
                <div>
                  <p className="text-sm text-gray-400">Performance</p>
                  <h4 className="font-semibold">Boosting Speed</h4>
                </div>
              </div>
            </div>

            <div className="absolute bottom-20 right-10 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-5 py-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  🛍️
                </div>
                <div>
                  <p className="text-sm text-gray-400">Shopping</p>
                  <h4 className="font-semibold">Better Experience</h4>
                </div>
              </div>
            </div>

            <div className="absolute top-1/2 right-12 -translate-y-1/2 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-5 py-4 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  🔒
                </div>
                <div>
                  <p className="text-sm text-gray-400">Security</p>
                  <h4 className="font-semibold">Enhanced Systems</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-center text-gray-500 text-sm tracking-wide">
        © 2026 Dripzoid. All Rights Reserved.
      </div>
    </div>
  );
}
