// Stroke icons drawn after Lucide (ISC license), 24×24 grid
const icons = {
  x: <path d="M18 6 6 18M6 6l12 12" />,
  locate: (
    <>
      <path d="M2 12h3M19 12h3M12 2v3M12 19v3" />
      <circle cx="12" cy="12" r="7" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  loader: <path d="M21 12a9 9 0 1 1-6.22-8.56" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z" />
    </>
  ),
  plane: (
    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
  ),
  layers: <path d="m12 2 10 5-10 5L2 7zM2 12l10 5 10-5M2 17l10 5 10-5" />,
  alert: <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3zM12 9v4M12 17h.01" />,
};

export function Icon({ name, spin }: { name: keyof typeof icons; spin?: boolean }) {
  return (
    <svg className={spin ? 'icon icon--spin' : 'icon'} viewBox="0 0 24 24" aria-hidden="true">
      {icons[name]}
    </svg>
  );
}
