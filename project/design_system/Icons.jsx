// Icons.jsx — Lucide-style line icons to substitute for Figma's
// un-exported SF-Symbols. Color comes from the surrounding CSS.
const Icon = ({ d, size = 20, stroke = "currentColor", strokeWidth = 2, fill = "none", children, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {d ? <path d={d} /> : children}
  </svg>
);

const Home    = (p) => <Icon {...p}><path d="M3 10l9-7 9 7v10a2 2 0 01-2 2h-4v-6H9v6H5a2 2 0 01-2-2z"/></Icon>;
const User    = (p) => <Icon {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></Icon>;
const Device  = (p) => <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 21h8"/></Icon>;
const Lock    = (p) => <Icon {...p}><rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V7a4 4 0 118 0v4"/></Icon>;
const Gear    = (p) => <Icon {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 00.3 1.8 2 2 0 11-2.8 2.8 1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0 1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3 2 2 0 11-2.8-2.8 1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4 1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8 2 2 0 012.8-2.8 1.7 1.7 0 001.8.3 1.7 1.7 0 001-1.5V3a2 2 0 014 0 1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3 2 2 0 012.8 2.8 1.7 1.7 0 00-.3 1.8 1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z"/></Icon>;
const Logout  = (p) => <Icon {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></Icon>;
const Search  = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></Icon>;
const Plus    = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
const Chevron = (p) => <Icon {...p}><path d="M6 9l6 6 6-6"/></Icon>;
const X       = (p) => <Icon {...p}><path d="M18 6L6 18M6 6l12 12"/></Icon>;
const Check   = (p) => <Icon {...p}><path d="M5 12l5 5L20 7"/></Icon>;
const Bell    = (p) => <Icon {...p}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></Icon>;
const Caret   = (p) => <Icon {...p} strokeWidth={2.2}><path d="M9 6l6 6-6 6"/></Icon>;
const Dots    = (p) => <Icon {...p}><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></Icon>;

const Logo = ({ size = 28, color = "var(--fg-1)" }) => (
  <svg width={size * 35.633/32} height={size} viewBox="0 0 35.633 32" fill="none">
    <path d="M 35.182 17.696 L 31.304 24.453 L 18.578 2.336 C 18.02 1.378 17.234 0.576 16.291 0 L 25.024 0 C 25.618 0.001 26.201 0.158 26.715 0.457 C 27.228 0.755 27.655 1.184 27.953 1.7 L 35.182 14.295 C 35.477 14.812 35.633 15.399 35.633 15.995 C 35.633 16.592 35.477 17.178 35.182 17.696 Z M 18.694 29.47 C 20.494 31.766 23.966 31.977 24.834 32 L 25.066 32 C 25.611 31.996 26.146 31.86 26.627 31.603 C 27.108 31.346 27.521 30.977 27.83 30.526 L 30.456 25.948 L 25.579 17.49 L 18.694 29.47 Z M 17.034 29.655 L 4.325 7.545 L 0.451 14.293 C 0.156 14.81 0 15.396 0 15.993 C 0 16.59 0.156 17.176 0.451 17.693 L 7.664 30.29 C 7.961 30.81 8.389 31.242 8.904 31.542 C 9.42 31.842 10.006 32 10.601 32 L 19.335 32 C 18.39 31.425 17.602 30.623 17.043 29.664 L 17.034 29.655 Z M 16.925 2.525 C 15.134 0.234 11.66 0.016 10.79 0 L 10.574 0 C 9.986 0.007 9.411 0.167 8.904 0.465 C 8.397 0.763 7.975 1.188 7.68 1.698 L 5.179 6.057 L 10.056 14.514 L 16.925 2.525 Z" fill={color} fillRule="nonzero"/>
  </svg>
);

Object.assign(window, { Home, User, Device, Lock, Gear, Logout, Search, Plus, Chevron, X, Check, Bell, Caret, Dots, Logo });
