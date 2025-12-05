import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export type BrokerId = "xm" | "unknown";

type BrokerTimezoneProfile = {
  id: BrokerId;
  label: string;
  timezone: string;
};

export const BROKER_TIMEZONES: Record<BrokerId, BrokerTimezoneProfile> = {
  xm: {
    id: "xm",
    label: "XM (MT4/MT5標準サーバー時間)",
    timezone: "Europe/Athens",
  },
  unknown: {
    id: "unknown",
    label: "タイムゾーン未設定",
    timezone: "UTC",
  },
};

export type BrokerLocalToUtcParams = {
  rawLocal: string;
  brokerId: BrokerId;
  format?: string;
};

const DEFAULT_DATETIME_FORMAT = "YYYY-MM-DD HH:mm:ss";

export const convertBrokerLocalToUtc = ({
  rawLocal,
  brokerId,
  format = DEFAULT_DATETIME_FORMAT,
}: BrokerLocalToUtcParams): string => {
  const profile = BROKER_TIMEZONES[brokerId] ?? BROKER_TIMEZONES.unknown;

  const local = dayjs.tz(rawLocal, format, profile.timezone);

  if (!local.isValid()) {
    return dayjs.utc(rawLocal).toISOString();
  }

  return local.utc().toISOString();
};

export const formatAsJst = (utcIsoString: string, format: string = "YYYY-MM-DD HH:mm"): string => {
  return dayjs.utc(utcIsoString).tz("Asia/Tokyo").format(format);
};

export const formatAsJstDate = (utcIsoString: string): string => {
  return formatAsJst(utcIsoString, "YYYY-MM-DD");
};

export const formatAsJstTime = (utcIsoString: string): string => {
  return formatAsJst(utcIsoString, "HH:mm:ss");
};

export const formatAsJstDateTime = (utcIsoString: string): string => {
  return formatAsJst(utcIsoString, "YYYY-MM-DD HH:mm:ss");
};
