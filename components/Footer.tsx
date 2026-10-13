import Link from 'next/link';

export const RESPONSIBLE_LINE =
  'Educational trainer. Play money only. Basic strategy reduces the house edge but doesn\'t eliminate it.';

export default function Footer() {
  return (
    <footer className="mt-10 border-t border-line pt-4 pb-2 text-center text-xs leading-5 text-faint">
      <p>{RESPONSIBLE_LINE}</p>
      <p className="mt-1">
        <Link href="/about/" className="inline-flex min-h-11 items-center underline underline-offset-2">
          About &amp; help
        </Link>
        <span aria-hidden="true"> · </span>A C2T Builds app
      </p>
    </footer>
  );
}
