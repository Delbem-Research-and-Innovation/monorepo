/**
 * `adminLevelMap` is an adaptation of Open Street Map's admin_levels,
 * extended to cover additional cases like 'location' and 'city blocks'.
 * It maps administrative regions to numeric levels, where lower numbers
 * represent higher administrative levels.
 */
export const adminLevelMap = {
  country: 2, // Represents the national level
  state: 4, // State or province, depending on the country
  province: 4, // Province, used in certain countries
  region: 4, // Administrative region
  county: 6, // County or similar subdivisions
  district: 6, // District, often used in urban or rural settings
  municipality: 8, // Municipality or city-level administration
  city: 8, // City, urban area
  town: 8, // Town or larger village
  village: 8, // Village or small locality
  census_region: 9, // Census region, used for statistical purposes
  neighborhood: 10, // Neighborhood, a small community within a city or town
  subdistrict: 10, // Subdivision of a district
  block: 11, // City block or urban division
  street: 11, // Street or road
  address: 13, // Completed address of an specific location, a point in the map
  latlong: 13, // Latitude and longitude
};
