import site from "../content/site.json";
import {buildSeries, regionProfiles} from "./data.js";
const files=import.meta.glob("../content/countries/*.json",{eager:true,import:"default"});
export const catalog=Object.values(files).map(record=>{
  const values=record.values || {};
  const series=buildSeries(values);
  const indicatorSources={};
  for(const row of record.observations || []){
    if(!series[row.year]?.[row.group]) continue;
    series[row.year][row.group][row.indicator]=row.value;
    indicatorSources[row.year+row.group+row.indicator]=row.url;
  }
  return {...record,values,policy:record.policy || {},series,indicatorSources,id:record.iso.toLowerCase(),regionLabel:regionProfiles[record.region]?.label};
}).sort((a,b)=>a.name.localeCompare(b.name,"es"));
export const content={...site,references:(site.references || []).map(({label,url})=>[label,url])};
export const cmsUrl="https://app.pagescms.org/LeirBaGMC/PageLove/main";
