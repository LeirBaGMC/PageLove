const origin = "https://mentatlas-wk7t8oop.manus.space";
const file = "https://api.github.com/repos/LeirBaGMC/PageLove/contents/public/countries.json";
export default {
  async fetch(request, env) {
    const headers = {"Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers":"Authorization, Content-Type", "Access-Control-Allow-Methods":"GET, PUT, OPTIONS", "Cache-Control":"no-store"};
    const reply = (body, status=200) => Response.json(body,{status,headers});
    if(request.method === "OPTIONS") return new Response(null,{headers});
    const github = {"User-Agent":"MentAtlas", Authorization:"Bearer "+env.GITHUB_TOKEN};
    try {
      if(request.method === "GET"){
        const response = await fetch(file+"?ref=main",{headers:github});
        if(!response.ok) return reply({error:"No se pudo leer el catálogo."},502);
        const data = await response.json();
        const bytes = Uint8Array.from(atob(data.content), c=>c.charCodeAt(0));
        return reply({sha:data.sha, countries:JSON.parse(new TextDecoder().decode(bytes))});
      }
      if(request.method !== "PUT") return reply({},405);
      if(!env.EDITOR_KEY || request.headers.get("Authorization") !== "Bearer "+env.EDITOR_KEY) return reply({error:"Clave de edición incorrecta."},403);
      const {countries,sha} = await request.json();
      if(!/^[a-f0-9]{40}$/.test(sha) || !Array.isArray(countries) || !countries.every(c=> c && typeof c.name==="string" && typeof c.id==="string" && /^[A-Z]{2}$/.test(c.iso) && c.policy && c.values && c.series) || new Set(countries.map(c=>c.iso)).size!==countries.length) return reply({error:"Catálogo inválido."},400);
      const bytes = new TextEncoder().encode(JSON.stringify(countries,null,2));
      if(bytes.length>950000) return reply({error:"Catálogo demasiado grande."},413);
      const content=btoa(Array.from(bytes,c=>String.fromCharCode(c)).join(""));
      const response=await fetch(file,{method:"PUT",headers:{...github,"Content-Type":"application/json"},body:JSON.stringify({branch:"main",message:"Actualizar fichas de MentAtlas",sha,content})});
      if(!response.ok) return reply({error:response.status===409?"Otra persona guardó cambios. Recarga antes de editar.":"GitHub rechazó el cambio."},response.status);
      return reply({sha:(await response.json()).content.sha});
    } catch {return reply({error:"No se pudo completar la operación."},502);}
  }
};
