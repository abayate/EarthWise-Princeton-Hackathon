export function KnotLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className}
      style={{ fillRule: "evenodd", clipRule: "evenodd" }}
    >
      <path
        fill="currentColor"
        d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 90c-22.1 0-40-17.9-40-40s17.9-40 40-40 40 17.9 40 40-17.9 40-40 40z"
      />
      <path
        fill="currentColor"
        d="M65 35H35c-5.5 0-10 4.5-10 10v10c0 5.5 4.5 10 10 10h30c5.5 0 10-4.5 10-10V45c0-5.5-4.5-10-10-10zm0 20H35V45h30v10z"
      />
    </svg>
  );
}