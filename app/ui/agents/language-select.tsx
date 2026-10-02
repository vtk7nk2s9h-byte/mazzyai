'use client';

import { setRetellLanguage } from '@/app/lib/retell-actions';
import {
  AGENT_LANGUAGES,
  LANGUAGE_INFO,
  type AgentLanguage,
} from '@/app/lib/retell-options';
import BadgeSelect from '@/app/ui/badge-select';
import { LanguageBadge } from '@/app/ui/organizations/status';

const info = (locale: string) => LANGUAGE_INFO[locale as AgentLanguage];

/**
 * An agent's language as the same badge picker the organization status, plan
 * and team role use. The badge shows the short code (EN, AR, NL); the list adds
 * the name. An agent on a locale outside the three, or on several, shows those
 * codes as they are and has none ticked in the list.
 */
export default function LanguageSelect({
  agentId,
  language,
}: {
  agentId: string;
  /** Retell's value: one locale, or an array of them. */
  language: string | string[];
}) {
  const locales = [language].flat();
  const shown = locales.map((l) => info(l)?.code ?? l).join(', ');

  return (
    <BadgeSelect
      value={locales.length === 1 ? locales[0] : ''}
      options={AGENT_LANGUAGES}
      noun="Language"
      ariaLabel="Change agent language"
      badge={<LanguageBadge language={shown} />}
      format={(l) => (info(l) ? `${info(l).code} · ${info(l).name}` : l)}
      save={(next) => setRetellLanguage(agentId, next)}
    />
  );
}
