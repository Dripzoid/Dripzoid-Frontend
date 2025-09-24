import React from "react";

const LogoBorderLoader = () => {
  return (
    <>
      <div className="logo-loader"></div>

      <style>{`
        .logo-loader {
          width: 160px;
          height: 160px;

          /* Use logo as mask */
          -webkit-mask: url("https://i.ibb.co/sdD2z336/logo.png") no-repeat center/contain;
          mask: url("https://i.ibb.co/sdD2z336/logo.png") no-repeat center/contain;

          background: none;
          position: relative;
        }

        .logo-loader::before {
          content: "";
          position: absolute;
          inset: 0;
          -webkit-mask: url("https://i.ibb.co/sdD2z336/logo.png") no-repeat center/contain;
          mask: url("https://i.ibb.co/sdD2z336/logo.png") no-repeat center/contain;

          background: linear-gradient(
            90deg,
            rgba(255,255,255,0) 20%,
            rgba(255,255,255,1) 50%,
            rgba(255,255,255,0) 80%
          );
          background-size: 200% 100%;

          /* Only shimmer animation */
          animation: border-shine 4s infinite linear;
        }

        @keyframes border-shine {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
};

export default LogoBorderLoader;
