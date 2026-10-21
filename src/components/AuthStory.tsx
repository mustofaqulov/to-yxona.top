'use client';

import { useAppSettings } from './AppSettings';
import { designCopy } from '@/lib/design-copy';

export default function AuthStory() {
  const { language } = useAppSettings();
  const copy = designCopy[language];
  return <aside className="auth-story"><h2>{copy.cta}</h2><p>{copy.authText}</p></aside>;
}
