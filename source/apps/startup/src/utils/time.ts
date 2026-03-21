import moment from "moment";

export function getFulltimeFormatted(): string {
  return moment().format("DD.MM.YYYY HH:mm:ss");
}
