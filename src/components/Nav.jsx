'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import styles from './Nav.module.css';

const links = [
  { href: '/',          label: 'Home'      },
  { href: '/sender',    label: '📢 Send'   },
  { href: '/receiver',  label: '👂 Hear'   },
  { href: '/dropzone',  label: '📁 Files'  },
  { href: '/stats',     label: '📊 Stats'  },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        Sound<span>Drop</span>
      </Link>
      <ul className={styles.links}>
        {links.map(l => (
          <li key={l.href}>
            <Link
              href={l.href}
              className={`${styles.link} ${path === l.href ? styles.active : ''}`}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
