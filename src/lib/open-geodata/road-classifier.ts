import type { OpenRoadClass } from "@/src/lib/open-geodata/types";

export function classifyRoadClass(properties: Record<string, unknown>): OpenRoadClass {
  const highway = String(properties.highway ?? properties.roadClass ?? "").toLowerCase();

  if (["motorway", "motorway_link"].includes(highway)) return "motorway";
  if (["trunk", "trunk_link"].includes(highway)) return "trunk";
  if (["primary", "primary_link"].includes(highway)) return "primary";
  if (["secondary", "secondary_link"].includes(highway)) return "secondary";
  if (["service", "track"].includes(highway)) return "service";
  return "local";
}

export function roadDisplayPriority(roadClass: OpenRoadClass) {
  const priorities: Record<OpenRoadClass, number> = {
    motorway: 90,
    trunk: 82,
    primary: 72,
    secondary: 55,
    local: 35,
    service: 20
  };

  return priorities[roadClass];
}

