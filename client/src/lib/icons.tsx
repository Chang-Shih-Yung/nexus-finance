'use client'

import { useThemeCustomizer } from '@/components/ThemeCustomizerProvider'
import type { ComponentType } from 'react'

// ── Lucide ────────────────────────────────────────────────────────────────────
import {
  Activity as L_Activity,
  AlertCircle as L_AlertCircle,
  AlertTriangle as L_AlertTriangle,
  ArrowLeft as L_ArrowLeft,
  ArrowLeftRight as L_ArrowLeftRight,
  ArrowRight as L_ArrowRight,
  AudioLines as L_AudioLines,
  Bell as L_Bell,
  Bot as L_Bot,
  Calendar as L_Calendar,
  Camera as L_Camera,
  Car as L_Car,
  Check as L_Check,
  CheckCircle2 as L_CheckCircle2,
  ChevronDown as L_ChevronDown,
  ChevronLeft as L_ChevronLeft,
  ChevronRight as L_ChevronRight,
  ChevronUp as L_ChevronUp,
  CircleAlert as L_CircleAlert,
  CircleHelp as L_CircleHelp,
  CirclePlus as L_CirclePlus,
  Cloud as L_Cloud,
  Coffee as L_Coffee,
  Container as L_Container,
  Copy as L_Copy,
  CreditCard as L_CreditCard,
  DollarSign as L_DollarSign,
  Download as L_Download,
  FileBarChart as L_FileBarChart,
  FileText as L_FileText,
  Gauge as L_Gauge,
  Globe as L_Globe,
  Image as L_Image,
  Info as L_Info,
  LayoutDashboard as L_LayoutDashboard,
  Link as L_Link,
  Loader2 as L_Loader2,
  Lock as L_Lock,
  LockKeyhole as L_LockKeyhole,
  LogIn as L_LogIn,
  Menu as L_Menu,
  MessageSquare as L_MessageSquare,
  Minus as L_Minus,
  Monitor as L_Monitor,
  Moon as L_Moon,
  MoreHorizontal as L_MoreHorizontal,
  PanelLeft as L_PanelLeft,
  Plus as L_Plus,
  RefreshCw as L_RefreshCw,
  Repeat as L_Repeat,
  Search as L_Search,
  Send as L_Send,
  Server as L_Server,
  Settings as L_Settings,
  Share as L_Share,
  Shield as L_Shield,
  ShoppingBag as L_ShoppingBag,
  ShoppingCart as L_ShoppingCart,
  Sun as L_Sun,
  Target as L_Target,
  Terminal as L_Terminal,
  Thermometer as L_Thermometer,
  Timer as L_Timer,
  Trash as L_Trash,
  TrendingDown as L_TrendingDown,
  TrendingUp as L_TrendingUp,
  Tv as L_Tv,
  Zap as L_Zap,
  UnlockKeyhole as L_UnlockKeyhole,
  UploadCloud as L_UploadCloud,
  User as L_User,
  Volume2 as L_Volume2,
  Wallet as L_Wallet,
  X as L_X,
} from 'lucide-react'

// ── Tabler ────────────────────────────────────────────────────────────────────
import {
  IconActivity as T_Activity,
  IconAlertCircle as T_AlertCircle,
  IconAlertTriangle as T_AlertTriangle,
  IconArrowLeft as T_ArrowLeft,
  IconArrowsLeftRight as T_ArrowLeftRight,
  IconArrowRight as T_ArrowRight,
  IconBell as T_Bell,
  IconRobot as T_Bot,
  IconCalendar as T_Calendar,
  IconCamera as T_Camera,
  IconCar as T_Car,
  IconCheck as T_Check,
  IconCircleCheck as T_CheckCircle2,
  IconChevronDown as T_ChevronDown,
  IconChevronLeft as T_ChevronLeft,
  IconChevronRight as T_ChevronRight,
  IconChevronUp as T_ChevronUp,
  IconAlertCircleFilled as T_CircleAlert,
  IconHelpCircle as T_CircleHelp,
  IconCirclePlus as T_CirclePlus,
  IconCloud as T_Cloud,
  IconCoffee as T_Coffee,
  IconBox as T_Container,
  IconCopy as T_Copy,
  IconCreditCard as T_CreditCard,
  IconCurrencyDollar as T_DollarSign,
  IconDownload as T_Download,
  IconChartBar as T_FileBarChart,
  IconFileText as T_FileText,
  IconGauge as T_Gauge,
  IconWorld as T_Globe,
  IconPhoto as T_Image,
  IconInfoCircle as T_Info,
  IconLayoutDashboard as T_LayoutDashboard,
  IconLink as T_Link,
  IconLoader2 as T_Loader2,
  IconLock as T_Lock,
  IconLock as T_LockKeyhole,
  IconLogin as T_LogIn,
  IconMenu2 as T_Menu,
  IconMessage as T_MessageSquare,
  IconMinus as T_Minus,
  IconDeviceDesktop as T_Monitor,
  IconMoon as T_Moon,
  IconDots as T_MoreHorizontal,
  IconLayoutSidebarLeftCollapse as T_PanelLeft,
  IconPlus as T_Plus,
  IconRefresh as T_RefreshCw,
  IconRepeat as T_Repeat,
  IconSearch as T_Search,
  IconSend as T_Send,
  IconServer as T_Server,
  IconSettings as T_Settings,
  IconShare as T_Share,
  IconShield as T_Shield,
  IconShoppingBag as T_ShoppingBag,
  IconShoppingCart as T_ShoppingCart,
  IconSun as T_Sun,
  IconTarget as T_Target,
  IconTerminal2 as T_Terminal,
  IconTemperature as T_Thermometer,
  IconClock as T_Timer,
  IconTrash as T_Trash,
  IconTrendingDown as T_TrendingDown,
  IconTrendingUp as T_TrendingUp,
  IconDeviceTv as T_Tv,
  IconBolt as T_Zap,
  IconLockOpen as T_UnlockKeyhole,
  IconCloudUpload as T_UploadCloud,
  IconUser as T_User,
  IconVolume as T_Volume2,
  IconWallet as T_Wallet,
  IconX as T_X,
} from '@tabler/icons-react'

// ── Phosphor ──────────────────────────────────────────────────────────────────
import {
  Pulse as P_Activity,
  WarningCircle as P_AlertCircle,
  Warning as P_AlertTriangle,
  ArrowLeft as P_ArrowLeft,
  ArrowsLeftRight as P_ArrowLeftRight,
  ArrowRight as P_ArrowRight,
  Waveform as P_AudioLines,
  Bell as P_Bell,
  Robot as P_Bot,
  Calendar as P_Calendar,
  Camera as P_Camera,
  Car as P_Car,
  Check as P_Check,
  CheckCircle as P_CheckCircle2,
  CaretDown as P_ChevronDown,
  CaretLeft as P_ChevronLeft,
  CaretRight as P_ChevronRight,
  CaretUp as P_ChevronUp,
  WarningCircle as P_CircleAlert,
  Question as P_CircleHelp,
  PlusCircle as P_CirclePlus,
  Cloud as P_Cloud,
  Coffee as P_Coffee,
  Package as P_Container,
  Copy as P_Copy,
  CreditCard as P_CreditCard,
  CurrencyDollar as P_DollarSign,
  Download as P_Download,
  ChartBar as P_FileBarChart,
  FileText as P_FileText,
  Gauge as P_Gauge,
  Globe as P_Globe,
  Image as P_Image,
  Info as P_Info,
  SquaresFour as P_LayoutDashboard,
  Link as P_Link,
  Spinner as P_Loader2,
  Lock as P_Lock,
  LockKey as P_LockKeyhole,
  SignIn as P_LogIn,
  List as P_Menu,
  ChatTeardrop as P_MessageSquare,
  Minus as P_Minus,
  Monitor as P_Monitor,
  Moon as P_Moon,
  DotsThree as P_MoreHorizontal,
  Sidebar as P_PanelLeft,
  Plus as P_Plus,
  ArrowClockwise as P_RefreshCw,
  Repeat as P_Repeat,
  MagnifyingGlass as P_Search,
  PaperPlaneTilt as P_Send,
  HardDrives as P_Server,
  Gear as P_Settings,
  ShareNetwork as P_Share,
  Shield as P_Shield,
  Tote as P_ShoppingBag,
  ShoppingCart as P_ShoppingCart,
  Sun as P_Sun,
  Crosshair as P_Target,
  Terminal as P_Terminal,
  Thermometer as P_Thermometer,
  Timer as P_Timer,
  Trash as P_Trash,
  TrendDown as P_TrendingDown,
  TrendUp as P_TrendingUp,
  Television as P_Tv,
  Lightning as P_Zap,
  LockKeyOpen as P_UnlockKeyhole,
  CloudArrowUp as P_UploadCloud,
  User as P_User,
  SpeakerHigh as P_Volume2,
  Wallet as P_Wallet,
  X as P_X,
} from '@phosphor-icons/react'

// ── Remix ─────────────────────────────────────────────────────────────────────
import {
  RiArrowLeftLine as R_ArrowLeft,
  RiArrowLeftRightLine as R_ArrowLeftRight,
  RiArrowRightLine as R_ArrowRight,
  RiBellLine as R_Bell,
  RiCalendarLine as R_Calendar,
  RiCameraLine as R_Camera,
  RiCarLine as R_Car,
  RiCheckLine as R_Check,
  RiCloudLine as R_Cloud,
  RiCopyleftLine as R_Coffee,
  RiFileCopyLine as R_Copy,
  RiMoneyDollarBoxLine as R_DollarSign,
  RiDownloadLine as R_Download,
  RiFileTextLine as R_FileText,
  RiGlobeLine as R_Globe,
  RiImageLine as R_Image,
  RiInformationLine as R_Info,
  RiDashboardLine as R_LayoutDashboard,
  RiLinkM as R_Link,
  RiLoader2Line as R_Loader2,
  RiLockLine as R_Lock,
  RiMenuLine as R_Menu,
  RiSubtractLine as R_Minus,
  RiMoonLine as R_Moon,
  RiAddLine as R_Plus,
  RiRefreshLine as R_RefreshCw,
  RiRepeatLine as R_Repeat,
  RiSearchLine as R_Search,
  RiSendPlaneLine as R_Send,
  RiServerLine as R_Server,
  RiSettings3Line as R_Settings,
  RiShareLine as R_Share,
  RiShieldLine as R_Shield,
  RiShoppingBagLine as R_ShoppingBag,
  RiShoppingCartLine as R_ShoppingCart,
  RiSunLine as R_Sun,
  RiFocus3Line as R_Target,
  RiTerminalLine as R_Terminal,
  RiThermometerLine as R_Thermometer,
  RiTimerLine as R_Timer,
  RiTvLine as R_Tv,
  RiUploadCloudLine as R_UploadCloud,
  RiUserLine as R_User,
  RiWalletLine as R_Wallet,
  RiCloseLine as R_X,
} from '@remixicon/react'

// ── Hugeicons ─────────────────────────────────────────────────────────────────
import {
  Activity01Icon as H_Activity,
  AlertCircleIcon as H_AlertCircle,
  ArrowLeft01Icon as H_ArrowLeft,
  ArrowLeftRightIcon as H_ArrowLeftRight,
  ArrowRight01Icon as H_ArrowRight,
  BotIcon as H_Bot,
  Calendar01Icon as H_Calendar,
  Camera01Icon as H_Camera,
  Car01Icon as H_Car,
  Copy01Icon as H_Copy,
  Download01Icon as H_Download,
  Globe02Icon as H_Globe,
  Image01Icon as H_Image,
  InformationCircleIcon as H_Info,
  Link01Icon as H_Link,
  Login01Icon as H_LogIn,
  Menu01Icon as H_Menu,
  Moon01Icon as H_Moon,
  RepeatIcon as H_Repeat,
  Search01Icon as H_Search,
  Settings01Icon as H_Settings,
  Share01Icon as H_Share,
  Shield01Icon as H_Shield,
  ShoppingBag01Icon as H_ShoppingBag,
  ShoppingCart01Icon as H_ShoppingCart,
  Sun01Icon as H_Sun,
  Target01Icon as H_Target,
  Timer01Icon as H_Timer,
  Delete01Icon as H_Trash,
  Tv01Icon as H_Tv,
  User02Icon as H_User,
  Wallet01Icon as H_Wallet,
} from 'hugeicons-react'

// ── Mapping ───────────────────────────────────────────────────────────────────

type Lib = 'lucide' | 'tabler' | 'phosphor' | 'remixicon' | 'hugeicons'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Entry = Partial<Record<Lib, ComponentType<any>>>

const m: Record<string, Entry> = {
  Activity:         { lucide: L_Activity, tabler: T_Activity, phosphor: P_Activity, hugeicons: H_Activity },
  AlertCircle:      { lucide: L_AlertCircle, tabler: T_AlertCircle, phosphor: P_AlertCircle, hugeicons: H_AlertCircle },
  AlertTriangle:    { lucide: L_AlertTriangle, tabler: T_AlertTriangle, phosphor: P_AlertTriangle },
  ArrowLeft:        { lucide: L_ArrowLeft, tabler: T_ArrowLeft, phosphor: P_ArrowLeft, remixicon: R_ArrowLeft, hugeicons: H_ArrowLeft },
  ArrowLeftRight:   { lucide: L_ArrowLeftRight, tabler: T_ArrowLeftRight, phosphor: P_ArrowLeftRight, remixicon: R_ArrowLeftRight, hugeicons: H_ArrowLeftRight },
  ArrowRight:       { lucide: L_ArrowRight, tabler: T_ArrowRight, phosphor: P_ArrowRight, remixicon: R_ArrowRight, hugeicons: H_ArrowRight },
  AudioLines:       { lucide: L_AudioLines, phosphor: P_AudioLines },
  Bell:             { lucide: L_Bell, tabler: T_Bell, phosphor: P_Bell, remixicon: R_Bell },
  Bot:              { lucide: L_Bot, tabler: T_Bot, phosphor: P_Bot, hugeicons: H_Bot },
  Calendar:         { lucide: L_Calendar, tabler: T_Calendar, phosphor: P_Calendar, remixicon: R_Calendar, hugeicons: H_Calendar },
  Camera:           { lucide: L_Camera, tabler: T_Camera, phosphor: P_Camera, remixicon: R_Camera, hugeicons: H_Camera },
  Car:              { lucide: L_Car, tabler: T_Car, phosphor: P_Car, remixicon: R_Car, hugeicons: H_Car },
  Check:            { lucide: L_Check, tabler: T_Check, phosphor: P_Check, remixicon: R_Check },
  CheckCircle2:     { lucide: L_CheckCircle2, tabler: T_CheckCircle2, phosphor: P_CheckCircle2 },
  ChevronDown:      { lucide: L_ChevronDown, tabler: T_ChevronDown, phosphor: P_ChevronDown },
  ChevronLeft:      { lucide: L_ChevronLeft, tabler: T_ChevronLeft, phosphor: P_ChevronLeft },
  ChevronRight:     { lucide: L_ChevronRight, tabler: T_ChevronRight, phosphor: P_ChevronRight },
  ChevronUp:        { lucide: L_ChevronUp, tabler: T_ChevronUp, phosphor: P_ChevronUp },
  CircleAlert:      { lucide: L_CircleAlert, tabler: T_CircleAlert, phosphor: P_CircleAlert },
  CircleHelp:       { lucide: L_CircleHelp, tabler: T_CircleHelp, phosphor: P_CircleHelp },
  CirclePlus:       { lucide: L_CirclePlus, tabler: T_CirclePlus, phosphor: P_CirclePlus },
  Cloud:            { lucide: L_Cloud, tabler: T_Cloud, phosphor: P_Cloud, remixicon: R_Cloud },
  Coffee:           { lucide: L_Coffee, tabler: T_Coffee, phosphor: P_Coffee, remixicon: R_Coffee },
  Container:        { lucide: L_Container, tabler: T_Container, phosphor: P_Container },
  Copy:             { lucide: L_Copy, tabler: T_Copy, phosphor: P_Copy, remixicon: R_Copy, hugeicons: H_Copy },
  CreditCard:       { lucide: L_CreditCard, tabler: T_CreditCard, phosphor: P_CreditCard },
  DollarSign:       { lucide: L_DollarSign, tabler: T_DollarSign, phosphor: P_DollarSign, remixicon: R_DollarSign },
  Download:         { lucide: L_Download, tabler: T_Download, phosphor: P_Download, remixicon: R_Download, hugeicons: H_Download },
  FileBarChart:     { lucide: L_FileBarChart, tabler: T_FileBarChart, phosphor: P_FileBarChart },
  FileText:         { lucide: L_FileText, tabler: T_FileText, phosphor: P_FileText, remixicon: R_FileText },
  Gauge:            { lucide: L_Gauge, tabler: T_Gauge, phosphor: P_Gauge },
  Globe:            { lucide: L_Globe, tabler: T_Globe, phosphor: P_Globe, remixicon: R_Globe, hugeicons: H_Globe },
  Image:            { lucide: L_Image, tabler: T_Image, phosphor: P_Image, remixicon: R_Image, hugeicons: H_Image },
  Info:             { lucide: L_Info, tabler: T_Info, phosphor: P_Info, remixicon: R_Info, hugeicons: H_Info },
  LayoutDashboard:  { lucide: L_LayoutDashboard, tabler: T_LayoutDashboard, phosphor: P_LayoutDashboard, remixicon: R_LayoutDashboard },
  Link:             { lucide: L_Link, tabler: T_Link, phosphor: P_Link, remixicon: R_Link, hugeicons: H_Link },
  Loader2:          { lucide: L_Loader2, tabler: T_Loader2, phosphor: P_Loader2, remixicon: R_Loader2 },
  Lock:             { lucide: L_Lock, tabler: T_Lock, phosphor: P_Lock, remixicon: R_Lock },
  LockKeyhole:      { lucide: L_LockKeyhole, tabler: T_LockKeyhole, phosphor: P_LockKeyhole },
  LogIn:            { lucide: L_LogIn, tabler: T_LogIn, phosphor: P_LogIn, hugeicons: H_LogIn },
  Menu:             { lucide: L_Menu, tabler: T_Menu, phosphor: P_Menu, remixicon: R_Menu, hugeicons: H_Menu },
  MessageSquare:    { lucide: L_MessageSquare, tabler: T_MessageSquare, phosphor: P_MessageSquare },
  Minus:            { lucide: L_Minus, tabler: T_Minus, phosphor: P_Minus, remixicon: R_Minus },
  Monitor:          { lucide: L_Monitor, tabler: T_Monitor, phosphor: P_Monitor },
  Moon:             { lucide: L_Moon, tabler: T_Moon, phosphor: P_Moon, remixicon: R_Moon, hugeicons: H_Moon },
  MoreHorizontal:   { lucide: L_MoreHorizontal, tabler: T_MoreHorizontal, phosphor: P_MoreHorizontal },
  PanelLeft:        { lucide: L_PanelLeft, tabler: T_PanelLeft, phosphor: P_PanelLeft },
  Plus:             { lucide: L_Plus, tabler: T_Plus, phosphor: P_Plus, remixicon: R_Plus },
  RefreshCw:        { lucide: L_RefreshCw, tabler: T_RefreshCw, phosphor: P_RefreshCw, remixicon: R_RefreshCw },
  Repeat:           { lucide: L_Repeat, tabler: T_Repeat, phosphor: P_Repeat, remixicon: R_Repeat, hugeicons: H_Repeat },
  Search:           { lucide: L_Search, tabler: T_Search, phosphor: P_Search, remixicon: R_Search, hugeicons: H_Search },
  Send:             { lucide: L_Send, tabler: T_Send, phosphor: P_Send, remixicon: R_Send },
  Server:           { lucide: L_Server, tabler: T_Server, phosphor: P_Server, remixicon: R_Server },
  Settings:         { lucide: L_Settings, tabler: T_Settings, phosphor: P_Settings, remixicon: R_Settings, hugeicons: H_Settings },
  Share:            { lucide: L_Share, tabler: T_Share, phosphor: P_Share, remixicon: R_Share, hugeicons: H_Share },
  Shield:           { lucide: L_Shield, tabler: T_Shield, phosphor: P_Shield, remixicon: R_Shield, hugeicons: H_Shield },
  ShoppingBag:      { lucide: L_ShoppingBag, tabler: T_ShoppingBag, phosphor: P_ShoppingBag, remixicon: R_ShoppingBag, hugeicons: H_ShoppingBag },
  ShoppingCart:     { lucide: L_ShoppingCart, tabler: T_ShoppingCart, phosphor: P_ShoppingCart, remixicon: R_ShoppingCart, hugeicons: H_ShoppingCart },
  Sun:              { lucide: L_Sun, tabler: T_Sun, phosphor: P_Sun, remixicon: R_Sun, hugeicons: H_Sun },
  Target:           { lucide: L_Target, tabler: T_Target, phosphor: P_Target, remixicon: R_Target, hugeicons: H_Target },
  Terminal:         { lucide: L_Terminal, tabler: T_Terminal, phosphor: P_Terminal, remixicon: R_Terminal },
  Thermometer:      { lucide: L_Thermometer, tabler: T_Thermometer, phosphor: P_Thermometer, remixicon: R_Thermometer },
  Timer:            { lucide: L_Timer, tabler: T_Timer, phosphor: P_Timer, remixicon: R_Timer, hugeicons: H_Timer },
  Trash:            { lucide: L_Trash, tabler: T_Trash, phosphor: P_Trash, hugeicons: H_Trash },
  TrendingDown:     { lucide: L_TrendingDown, tabler: T_TrendingDown, phosphor: P_TrendingDown },
  TrendingUp:       { lucide: L_TrendingUp, tabler: T_TrendingUp, phosphor: P_TrendingUp },
  Tv:               { lucide: L_Tv, tabler: T_Tv, phosphor: P_Tv, remixicon: R_Tv, hugeicons: H_Tv },
  UnlockKeyhole:    { lucide: L_UnlockKeyhole, tabler: T_UnlockKeyhole, phosphor: P_UnlockKeyhole },
  UploadCloud:      { lucide: L_UploadCloud, tabler: T_UploadCloud, phosphor: P_UploadCloud, remixicon: R_UploadCloud },
  User:             { lucide: L_User, tabler: T_User, phosphor: P_User, remixicon: R_User, hugeicons: H_User },
  Volume2:          { lucide: L_Volume2, tabler: T_Volume2, phosphor: P_Volume2 },
  Wallet:           { lucide: L_Wallet, tabler: T_Wallet, phosphor: P_Wallet, remixicon: R_Wallet, hugeicons: H_Wallet },
  X:                { lucide: L_X, tabler: T_X, phosphor: P_X, remixicon: R_X },
  Zap:              { lucide: L_Zap, tabler: T_Zap, phosphor: P_Zap },
}

// ── Factory ───────────────────────────────────────────────────────────────────

function proxy(name: string) {
  const entry = m[name]!
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function IconProxy(props: Record<string, any>) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { config } = useThemeCustomizer()
    const Comp = entry[config.iconLibrary as Lib] ?? entry.lucide!
    return <Comp {...props} />
  }
  IconProxy.displayName = name
  return IconProxy
}

// ── Named exports (matching lucide-react API) ─────────────────────────────────

export const Activity = proxy('Activity')
export const AlertCircle = proxy('AlertCircle')
export const AlertTriangle = proxy('AlertTriangle')
export const ArrowLeft = proxy('ArrowLeft')
export const ArrowLeftIcon = proxy('ArrowLeft')
export const ArrowLeftRight = proxy('ArrowLeftRight')
export const ArrowRight = proxy('ArrowRight')
export const ArrowRightIcon = proxy('ArrowRight')
export const AudioLines = proxy('AudioLines')
export const Bell = proxy('Bell')
export const Bot = proxy('Bot')
export const Calendar = proxy('Calendar')
export const CalendarIcon = proxy('Calendar')
export const Camera = proxy('Camera')
export const Car = proxy('Car')
export const Check = proxy('Check')
export const CheckCircle2 = proxy('CheckCircle2')
export const CheckCircle2Icon = proxy('CheckCircle2')
export const CheckIcon = proxy('Check')
export const ChevronDown = proxy('ChevronDown')
export const ChevronDownIcon = proxy('ChevronDown')
export const ChevronLeft = proxy('ChevronLeft')
export const ChevronLeftIcon = proxy('ChevronLeft')
export const ChevronRight = proxy('ChevronRight')
export const ChevronRightIcon = proxy('ChevronRight')
export const ChevronUp = proxy('ChevronUp')
export const ChevronUpIcon = proxy('ChevronUp')
export const CircleAlert = proxy('CircleAlert')
export const CircleAlertIcon = proxy('CircleAlert')
export const CircleHelp = proxy('CircleHelp')
export const CirclePlus = proxy('CirclePlus')
export const Cloud = proxy('Cloud')
export const Coffee = proxy('Coffee')
export const ContainerIcon = proxy('Container')
export const Copy = proxy('Copy')
export const CopyIcon = proxy('Copy')
export const CreditCard = proxy('CreditCard')
export const DollarSign = proxy('DollarSign')
export const Download = proxy('Download')
export const DownloadIcon = proxy('Download')
export const FileBarChart = proxy('FileBarChart')
export const FileText = proxy('FileText')
export const Gauge = proxy('Gauge')
export const Globe = proxy('Globe')
// Note: Image conflicts with HTML Image constructor; consumers import as { Image }
export const ImageIcon = proxy('Image')
export const Info = proxy('Info')
export const InfoIcon = proxy('Info')
export const LayoutDashboard = proxy('LayoutDashboard')
export const Link = proxy('Link')
export const Loader2 = proxy('Loader2')
export const Loader2Icon = proxy('Loader2')
export const Lock = proxy('Lock')
export const LockKeyhole = proxy('LockKeyhole')
export const LogIn = proxy('LogIn')
export const Menu = proxy('Menu')
export const MessageSquare = proxy('MessageSquare')
export const Minus = proxy('Minus')
export const MinusIcon = proxy('Minus')
export const Monitor = proxy('Monitor')
export const MonitorIcon = proxy('Monitor')
export const Moon = proxy('Moon')
export const MoreHorizontal = proxy('MoreHorizontal')
export const MoreHorizontalIcon = proxy('MoreHorizontal')
export const PanelLeft = proxy('PanelLeft')
export const PanelLeftIcon = proxy('PanelLeft')
export const Plus = proxy('Plus')
export const PlusIcon = proxy('Plus')
export const RefreshCw = proxy('RefreshCw')
export const Repeat = proxy('Repeat')
export const Search = proxy('Search')
export const SearchIcon = proxy('Search')
export const Send = proxy('Send')
export const Server = proxy('Server')
export const ServerIcon = proxy('Server')
export const Settings = proxy('Settings')
export const SettingsIcon = proxy('Settings')
export const Share = proxy('Share')
export const ShareIcon = proxy('Share')
export const Shield = proxy('Shield')
export const ShoppingBag = proxy('ShoppingBag')
export const ShoppingBagIcon = proxy('ShoppingBag')
export const ShoppingCart = proxy('ShoppingCart')
export const Sun = proxy('Sun')
export const Target = proxy('Target')
export const Terminal = proxy('Terminal')
export const TerminalIcon = proxy('Terminal')
export const Thermometer = proxy('Thermometer')
export const Timer = proxy('Timer')
export const Trash = proxy('Trash')
export const TrashIcon = proxy('Trash')
export const TrendingDown = proxy('TrendingDown')
export const TrendingUp = proxy('TrendingUp')
export const Tv = proxy('Tv')
export const UnlockKeyhole = proxy('UnlockKeyhole')
export const UploadCloud = proxy('UploadCloud')
export const UploadCloudIcon = proxy('UploadCloud')
export const User = proxy('User')
export const Volume2 = proxy('Volume2')
export const Wallet = proxy('Wallet')
export const X = proxy('X')
export const XIcon = proxy('X')
export const Zap = proxy('Zap')
export const ZapIcon = proxy('Zap')
