import type { ComponentType } from 'react'
import {
  HiArrowRight, HiArrowDownTray, HiArrowUpTray,
  HiCog6Tooth, HiDocument, HiStar, HiBookmark,
  HiLink, HiEnvelope, HiCalendar, HiUser, HiUsers,
  HiHome, HiCodeBracket, HiChartBar, HiLockClosed,
  HiBell, HiCheck, HiPencil, HiGlobeAlt,
} from 'react-icons/hi2'
import {
  SiApple, SiGoogle, SiGmail, SiGoogledrive, SiGooglechrome,
  SiSlack, SiGithub, SiZoom, SiNotion, SiJira,
  SiConfluence, SiDropbox, SiSalesforce, SiAtlassian,
  SiTrello, SiHubspot, SiLinear, SiFigma, SiAsana, SiDocker,
} from 'react-icons/si'

export interface IconDef {
  id: string
  label: string
  component: ComponentType<{ size?: number; color?: string }>
}

export const STANDARD_ICONS: IconDef[] = [
  { id: 'arrow-right',  label: 'Arrow',     component: HiArrowRight },
  { id: 'download',     label: 'Download',  component: HiArrowDownTray },
  { id: 'upload',       label: 'Upload',    component: HiArrowUpTray },
  { id: 'gear',         label: 'Settings',  component: HiCog6Tooth },
  { id: 'document',     label: 'Document',  component: HiDocument },
  { id: 'star',         label: 'Star',      component: HiStar },
  { id: 'bookmark',     label: 'Bookmark',  component: HiBookmark },
  { id: 'link',         label: 'Link',      component: HiLink },
  { id: 'mail',         label: 'Mail',      component: HiEnvelope },
  { id: 'calendar',     label: 'Calendar',  component: HiCalendar },
  { id: 'user',         label: 'User',      component: HiUser },
  { id: 'users',        label: 'Team',      component: HiUsers },
  { id: 'home',         label: 'Home',      component: HiHome },
  { id: 'code',         label: 'Code',      component: HiCodeBracket },
  { id: 'chart',        label: 'Chart',     component: HiChartBar },
  { id: 'lock',         label: 'Lock',      component: HiLockClosed },
  { id: 'bell',         label: 'Alert',     component: HiBell },
  { id: 'check',        label: 'Check',     component: HiCheck },
  { id: 'edit',         label: 'Edit',      component: HiPencil },
  { id: 'globe',        label: 'Globe',     component: HiGlobeAlt },
]

export const BRAND_ICONS: IconDef[] = [
  { id: 'apple',       label: 'Apple',      component: SiApple },
  { id: 'google',      label: 'Google',     component: SiGoogle },
  { id: 'gmail',       label: 'Gmail',      component: SiGmail },
  { id: 'google-drive',label: 'Drive',      component: SiGoogledrive },
  { id: 'chrome',      label: 'Chrome',     component: SiGooglechrome },
  { id: 'slack',       label: 'Slack',      component: SiSlack },
  { id: 'github',      label: 'GitHub',     component: SiGithub },
  { id: 'zoom',        label: 'Zoom',       component: SiZoom },
  { id: 'notion',      label: 'Notion',     component: SiNotion },
  { id: 'figma',       label: 'Figma',      component: SiFigma },
  { id: 'jira',        label: 'Jira',       component: SiJira },
  { id: 'confluence',  label: 'Confluence', component: SiConfluence },
  { id: 'trello',      label: 'Trello',     component: SiTrello },
  { id: 'atlassian',   label: 'Atlassian',  component: SiAtlassian },
  { id: 'linear',      label: 'Linear',     component: SiLinear },
  { id: 'asana',       label: 'Asana',      component: SiAsana },
  { id: 'hubspot',     label: 'HubSpot',    component: SiHubspot },
  { id: 'salesforce',  label: 'Salesforce', component: SiSalesforce },
  { id: 'dropbox',     label: 'Dropbox',    component: SiDropbox },
  { id: 'docker',      label: 'Docker',     component: SiDocker },
]

export const DOC_TYPE_DEFAULT_ICON: Record<string, string> = {
  handoff:        'arrow-right',
  installation:   'download',
  'account-setup':'gear',
}

export function getStandardIcon(id: string): IconDef | undefined {
  return STANDARD_ICONS.find(i => i.id === id)
}

export function getBrandIcon(id: string): IconDef | undefined {
  return BRAND_ICONS.find(i => i.id === id)
}
