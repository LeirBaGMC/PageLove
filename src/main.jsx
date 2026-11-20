import { catalog as countries, content, cmsUrl } from "./catalog.js";
import { fields } from "./editorial.js";
import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import {
  
  disorders,

  years,

} from "./data.js";
import "./styles.css";

const REGION_OPTIONS = [
  ["all", "Todas las regiones"],
  ["latam", "Latinoamérica"],
  ["northamerica", "Norteamérica"],
  ["europe", "Europa"],
  ["asia", "Asia"],
  ["africa", "África"],
  ["oceania", "Oceanía"],
];
const DISORDER_OPTIONS = Object.entries(disorders);
const SCORES = {
  depression: 8,
  anxiety: 10,
  eating: 1,
  bipolar: 1.5,
  schizophrenia: 0.6,
};
const STORAGE_POLICIES = "mentatlas-policy-edits-v2";
const STORAGE_COUNTRIES = "mentatlas-extra-countries-v2";
function safeSourceUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function formatPct(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "N/D";
  return `${value.toLocaleString("es-EC", { minimumFractionDigits: value < 1 ? 2 : 1, maximumFractionDigits: 2 })}%`;
}

function Field({ label, children, hint }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function Metric({ value, label, note }) {
  return (
    <article className="metric-card">
      <span className="metric-value">{value}</span>
      <span className="metric-label">{label}</span>
      {note && <span className="metric-note">{note}</span>}
    </article>
  );
}

function MapView({
  features,
  countries,
  selectedId,
  selectedIso,
  region,
  disorder,
  year,
  group,
  onSelect,
  onRetry,
  error,
}) {
  const [hovered, setHovered] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 50, y: 18 });
  const showTooltip = (path, event) => {
    setHovered(path);
    const svg = event.currentTarget.ownerSVGElement;
    const bounds = svg?.getBoundingClientRect();
    if (!bounds?.width || !bounds?.height) return;
    setTooltipPosition({
      x: Math.max(
        8,
        Math.min(92, ((event.clientX - bounds.left) / bounds.width) * 100),
      ),
      y: Math.max(
        18,
        Math.min(92, ((event.clientY - bounds.top) / bounds.height) * 100),
      ),
    });
  };
  const paths = useMemo(
    () =>
      features.map((feature, index) => {
        const properties = feature.properties || {};
        const iso = properties["ISO3166-1-Alpha-2"];
        const country = countries.find((item) => item.iso === iso);
        return {
          key: `${iso || "none"}-${index}`,
          iso,
          name: properties.name || "Territorio sin nombre",
          d: feature._path || "",
          hasData: Boolean(country),
          value: (country?.series?.[year]?.[group] || country?.values)?.[
            disorder
          ],
          isSelected: country?.id === selectedId || iso === selectedIso,
          isMuted: region !== "all" && country && country.region !== region,
        };
      }),
    [
      features,
      countries,
      selectedId,
      selectedIso,
      region,
      disorder,
      year,
      group,
    ],
  );

  if (error)
    return (
      <div className="map-message map-error-message" role="alert">
        <div>
          <strong>El mapa no está disponible</strong>
          <p>{error}</p>
          <button
            type="button"
            className="button button-outline"
            onClick={() => onRetry()}
          >
            Reintentar carga
          </button>
        </div>
      </div>
    );
  if (!features.length)
    return (
      <div
        className="map-skeleton"
        role="status"
        aria-label="Cargando mapa mundial"
      >
        <span className="skeleton-sr-only">Cargando mapa mundial…</span>
        <div className="skeleton-map-head">
          <i />
          <i />
        </div>
        <div className="skeleton-map" aria-hidden="true">
          <i className="skeleton-continent continent-north" />
          <i className="skeleton-continent continent-south" />
          <i className="skeleton-continent continent-europe" />
          <i className="skeleton-continent continent-africa" />
          <i className="skeleton-continent continent-asia" />
          <i className="skeleton-continent continent-oceania" />
        </div>
        <div className="skeleton-map-foot">
          <i />
          <i />
          <i />
        </div>
      </div>
    );
  return (
    <div className="map-wrap">
      <div className="map-canvas">
        <svg
          className="world-map"
          viewBox="0 0 900 430"
          role="img"
          aria-labelledby="map-title map-desc"
        >
          <title id="map-title">
            Mapa mundial de indicadores de salud mental
          </title>
          <desc id="map-desc">
            Selecciona un territorio para consultar su ficha. Los colores
            señalan disponibilidad de datos indicativos.
          </desc>
          <g>
            {paths.map((path) => (
              <path
                key={path.key}
                d={path.d}
                className={`geo-country ${path.hasData ? "has-data" : "no-data"} ${path.isSelected ? "selected" : ""} ${path.isMuted ? "muted" : ""}`}
                fillRule="evenodd"
                tabIndex={path.hasData ? 0 : -1}
                role={path.iso ? "button" : undefined}
                aria-label={
                  path.iso
                    ? `${path.name}, ${path.hasData ? formatPct(path.value) : "sin ficha comparable"}`
                    : path.name
                }
                onMouseEnter={(event) => showTooltip(path, event)}
                onMouseLeave={() => setHovered(null)}
                onFocus={(event) => showTooltip(path, event)}
                onBlur={() => setHovered(null)}
                onClick={() => path.iso && onSelect(path.iso)}
                onKeyDown={(event) => {
                  if (
                    path.iso &&
                    (event.key === "Enter" || event.key === " ")
                  ) {
                    event.preventDefault();
                    onSelect(path.iso);
                  }
                }}
              >
                <title>
                  {path.name}
                  {path.hasData
                    ? " · ficha disponible"
                    : " · sin ficha comparable"}
                </title>
              </path>
            ))}
          </g>
        </svg>
        {hovered && (
          <div
            className="map-tooltip"
            role="status"
            style={{
              left: `${tooltipPosition.x}%`,
              top: `${tooltipPosition.y}%`,
            }}
          >
            <strong>{hovered.name}</strong>
            <span>
              {hovered.hasData
                ? formatPct(hovered.value)
                : "Sin ficha comparable"}
            </span>
          </div>
        )}
      </div>
      <div className="map-legend">
        <span>
          <i className="legend-dot legend-active" /> Ficha disponible
        </span>
        <span>
          <i className="legend-dot legend-muted" /> Sin ficha
        </span>
        <span>
          <i className="legend-dot legend-selected" /> Seleccionado
        </span>
        <span className="map-count">
          {countries.length} países · 6 regiones
        </span>
      </div>
    </div>
  );
}

function IndicatorBars({ values = {}, selectedDisorder }) {
  return (
    <div className="indicator-list">
      {DISORDER_OPTIONS.map(([key, item]) => {
        const value = values[key];
        const width =
          typeof value === "number"
            ? Math.max(3, Math.min(100, (value / SCORES[key]) * 100))
            : 0;
        return (
          <div className="indicator-row" key={key}>
            <div className="indicator-heading">
              <span>{item.label}</span>
              <strong>{formatPct(value)}</strong>
            </div>
            <div
              className="bar-track"
              aria-label={`${item.label}: ${formatPct(value)}`}
            >
              <span
                className={`bar-fill ${selectedDisorder === key ? "is-highlighted" : ""}`}
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CountryPanel({
  country,
  year,
  group,
  disorder,
  onYearChange,
  onPolicy,
}) {
  const [seriesYear, setSeriesYear] = useState(year);
  useEffect(() => setSeriesYear(year), [year]);
  const shownValues =
    country?.series?.[seriesYear]?.[group] || country?.values || {};
  const topIndicator = Object.entries(shownValues).sort(
    (a, b) => (b[1] || 0) - (a[1] || 0),
  )[0];
  const higher = topIndicator ? disorders[topIndicator[0]]?.short : "Sin datos";
  return (
    <section
      className="panel country-panel"
      aria-labelledby="country-panel-title"
      data-reveal
    >
      <div className="panel-head">
        <div>
          <p className="eyebrow">
            Ficha de país <span>· fuente revisada 2026</span>
          </p>
          <h2 id="country-panel-title">
            {country?.name || "Selecciona un territorio"}
          </h2>
        </div>
        <span className="country-code">{country?.iso || "—"}</span>
      </div>
      {country ? (
        <>
          <p className="country-meta">
            {country.regionLabel} <span>·</span>{" "}
            {group === "general"
              ? "población general"
              : group === "women"
                ? "mujeres"
                : "hombres"}
          </p>
          <p className="country-summary">
            {country.summary ||
              "La geometría está disponible, pero todavía no hay una serie comparable cargada."}
          </p>
          <div className="chart-title">
            <div>
              <span className="eyebrow">Indicadores seleccionados</span>
              <strong>{seriesYear}</strong>
            </div>
            <div className="year-arrows">
              <button
                type="button"
                aria-label="Año anterior"
                disabled={years.indexOf(seriesYear) === 0}
                onClick={() => {
                  const next =
                    years[Math.max(0, years.indexOf(seriesYear) - 1)];
                  setSeriesYear(next);
                  onYearChange(next);
                }}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Año siguiente"
                disabled={years.indexOf(seriesYear) === years.length - 1}
                onClick={() => {
                  const next =
                    years[
                      Math.min(years.length - 1, years.indexOf(seriesYear) + 1)
                    ];
                  setSeriesYear(next);
                  onYearChange(next);
                }}
              >
                ›
              </button>
            </div>
          </div>
          <div className="year-strip" aria-label="Años disponibles">
            {years.map((item) => (
              <button
                type="button"
                className={item === seriesYear ? "active" : ""}
                key={item}
                onClick={() => {
                  setSeriesYear(item);
                  onYearChange(item);
                }}
              >
                {item}
              </button>
            ))}
          </div>
          {Object.keys(shownValues).map((k) => (
            <Source
              key={k}
              url={country.indicatorSources?.[seriesYear + group + k]}
            >
              {disorders[k]?.label}
            </Source>
          ))}
          <IndicatorBars values={shownValues} selectedDisorder={disorder} />
          <div className="country-insights">
            <div>
              <strong>{higher}</strong>
              <span>indicador más alto</span>
            </div>
            <div>
              <strong>
                {Number.isFinite(country.score)
                  ? country.score + "/5"
                  : "Pendiente"}
              </strong>
              <span>respuesta pública</span>
            </div>
          </div>
          <p className="caveat">
            Estimación orientativa para explorar órdenes de magnitud.
            Definiciones, años y métodos no son equivalentes entre países.
          </p>
          {country.policy?.plan ? (
            <button
              type="button"
              className="button button-outline full-width"
              onClick={onPolicy}
            >
              Ver políticas de {country.name}
              <span aria-hidden="true">↗</span>
            </button>
          ) : (
            <p className="caveat no-policy-note">
              Aún no hay una ficha de política disponible para este territorio.
            </p>
          )}
        </>
      ) : (
        <div className="empty-state">
          Haz clic en un país del mapa o usa el directorio para abrir una ficha.
        </div>
      )}
    </section>
  );
}

function Directory({ countries, selectedId, search, setSearch, onSelect }) {
  const filtered = useMemo(
    () =>
      countries.filter(
        (country) =>
          country.name
            .toLocaleLowerCase("es")
            .includes(search.toLocaleLowerCase("es")) ||
          country.iso.toLowerCase().includes(search.toLowerCase()),
      ),
    [countries, search],
  );
  return (
    <section
      className="panel directory"
      aria-labelledby="directory-title"
      data-reveal
    >
      <div className="panel-head">
        <div>
          <p className="eyebrow">Directorio</p>
          <h2 id="directory-title">Explora países</h2>
        </div>
        <span className="subtle-count">{filtered.length}</span>
      </div>
      <label className="search-box">
        <span aria-hidden="true">⌕</span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar país o código ISO"
          aria-label="Buscar país o código ISO"
        />
      </label>
      <div className="directory-list" aria-label="Países con ficha">
        {filtered.length ? (
          filtered.map((country) => (
            <button
              type="button"
              className={`directory-item ${selectedId === country.id ? "selected" : ""}`}
              key={country.id}
              onClick={() => onSelect(country.iso)}
            >
              <span className="directory-code">{country.iso}</span>
              <span>{country.name}</span>
              <span className="item-arrow" aria-hidden="true">
                →
              </span>
            </button>
          ))
        ) : (
          <p className="empty-state">
            No hay países que coincidan con “{search}”.
          </p>
        )}
      </div>
    </section>
  );
}

function CompareView({
  countries,
  aId,
  bId,
  setAId,
  setBId,
  year,
  setYear,
  group,
  setGroup,
}) {
  const a = countries.find((country) => country.id === aId) || countries[0];
  const b =
    countries.find((country) => country.id === bId) ||
    countries[1] ||
    countries[0];
  const aValues = a?.series?.[year]?.[group] || a?.values || {};
  const bValues = b?.series?.[year]?.[group] || b?.values || {};
  return (
    <section
      className="content-section"
      aria-labelledby="compare-title"
      data-reveal
    >
      <div className="section-heading">
        <p className="eyebrow">03 / Comparar países</p>
        <h2 id="compare-title">Dos territorios, una lectura común.</h2>
        <p>
          Compara indicadores con la misma escala y el mismo año de referencia.
        </p>
      </div>
      <div className="compare-controls panel">
        <Field label="Primer país">
          <select
            value={a?.id || ""}
            onChange={(event) => setAId(event.target.value)}
          >
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </Field>
        <span className="versus">VS</span>
        <Field label="Segundo país">
          <select
            value={b?.id || ""}
            onChange={(event) => setBId(event.target.value)}
          >
            {countries.map((country) => (
              <option key={country.id} value={country.id}>
                {country.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Año">
          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            {years
              .slice()
              .reverse()
              .map((item) => (
                <option key={item}>{item}</option>
              ))}
          </select>
        </Field>
        <Field label="Grupo poblacional">
          <select
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          >
            <option value="general">Población general</option>
            <option value="women">Mujeres</option>
            <option value="men">Hombres</option>
          </select>
        </Field>
      </div>
      <div className="panel compare-panel">
        <div className="compare-caption">
          <span className="eyebrow">
            Prevalencia estimada · {year} ·{" "}
            {group === "general"
              ? "población general"
              : group === "women"
                ? "mujeres"
                : "hombres"}
          </span>
          <span>Escala por indicador</span>
        </div>
        <div className="compare-country-head">
          <strong>
            {a?.name} <small>{a?.iso}</small>
          </strong>
          <strong>
            {b?.name} <small>{b?.iso}</small>
          </strong>
        </div>
        {DISORDER_OPTIONS.map(([key, item]) => {
          const left = aValues[key];
          const right = bValues[key];
          const scale = SCORES[key];
          return (
            <div className="compare-row" key={key}>
              <div className="compare-label">
                <span>{item.label}</span>
                <span>
                  {formatPct(left)} <b>·</b> {formatPct(right)}
                </span>
              </div>
              <div className="duo-bars">
                <span
                  className="duo-bar left"
                  style={{
                    width: `${typeof left === "number" ? Math.min(100, (left / scale) * 100) : 0}%`,
                  }}
                />
                <span
                  className="duo-bar right"
                  style={{
                    width: `${typeof right === "number" ? Math.min(100, (right / scale) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>
          );
        })}
        <div className="compare-legend">
          <span>
            <i className="legend-dot legend-active" />
            {a?.name}
          </span>
          <span>
            <i className="legend-dot legend-coral" />
            {b?.name}
          </span>
        </div>
      </div>
      <h3>Respuesta pública</h3>
      <div className="method-grid">
        {[a, b].map((c, i) => (
          <article key={i} className="panel method-card">
            <h3>{c?.name}</h3>
            <p>{c?.policy.actions || "Pendiente de documentación nacional."}</p>
            <p>{c?.policy.coverage}</p>
            <Source url={c?.policy.link} />
          </article>
        ))}
      </div>
      <p className="caveat wide-caveat">
        Las series anuales y por grupo poblacional son aproximaciones generadas
        para explorar tendencias. No sustituyen estadísticas oficiales
        comparables.
      </p>
    </section>
  );
}

function PolicyView({ content, country, countries, onCountryChange, onEdit }) {
  return (
    <section
      className="content-section"
      aria-labelledby="policy-title"
      data-reveal
    >
      <div className="section-heading">
        <p className="eyebrow">02 / Políticas públicas</p>
        <h2 id="policy-title">De los indicadores a la respuesta pública.</h2>
        <p>
          Una ficha breve sobre el enfoque, cobertura e implementación del
          territorio seleccionado.
        </p>
      </div>
      <div className="policy-toolbar panel">
        <Field label="Territorio">
          <select
            value={country?.id || ""}
            onChange={(event) => onCountryChange(event.target.value)}
          >
            {countries.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <span className="policy-badge">Ficha nacional</span>
      </div>
      {country ? (
        <article className="panel policy-card">
          <div className="policy-intro">
            <span className="country-code large-code">{country.iso}</span>
            <div>
              <p className="eyebrow">{country.regionLabel} · marco público</p>
              <h3>{country.name}</h3>
              <p>{country.policy.source || "Documentación pendiente"}</p>
            </div>
            <div className="score-block">
              <strong>
                {Number.isFinite(country.score)
                  ? country.score + "/5"
                  : "Pendiente"}
              </strong>
              <span>respuesta pública</span>
            </div>
          </div>
          <div className="policy-grid">
            {fields.map(([field, title]) => (
              <div key={field}>
                <h4>{title}</h4>
                <p>
                  {country.policy[field] ||
                    "Pendiente de documentación nacional."}
                </p>
              </div>
            ))}
            <div>
              <h4>Actualización y fuente</h4>
              <p>
                {country.policy.source || "Fuente pendiente"} ·{" "}
                {country.policy.updated || "Fecha pendiente"}
              </p>
              <Source url={country.policy.link} />
            </div>
          </div>
          {onEdit && (
            <button className="text-button" onClick={onEdit}>
              Editar ficha
            </button>
          )}
        </article>
      ) : (
        <div className="panel empty-state">
          No hay una ficha de política para este país.
        </div>
      )}
      <aside className="source-card">
        <h3>El consenso internacional se mueve hacia la comunidad</h3>
        <p>{content.community}</p>
        <Source url={content.communityUrl}>Consultar guía de la OMS</Source>
      </aside>
    </section>
  );
}

function Source({ url, children = "Abrir fuente" }) {
  const href = safeSourceUrl(url);
  return href ? (
    <a
      className="button button-outline"
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {children} ↗
    </a>
  ) : null;
}
const methodLabels = {
  shows: "Qué muestra",
  limits: "Qué no muestra",
  construction: "Cómo se construyó",
};
function MethodView({ content }) {
  return (
    <section className="content-section">
      <div className="section-heading">
        <h2>Metodología</h2>
      </div>
      <div className="method-grid">
        {Object.entries(methodLabels).map(([key, title]) => (
          <article className="panel method-card" key={key}>
            <h3>{title}</h3>
            <p>{content[key] || "Pendiente de información."}</p>
          </article>
        ))}
        <article className="panel method-card">
          <h3>Fuentes de información</h3>
          {content.references.map(([label, url], i) => (
            <Source key={i} url={url}>
              {label}
            </Source>
          ))}
        </article>
      </div>
    </section>
  );
}
function App() {

  const [selectedId, setSelectedId] = useState("ec");
  const [region, setRegion] = useState("all");
  const [disorder, setDisorder] = useState("depression");
  const [group, setGroup] = useState("general");
  const [year, setYear] = useState("2026");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("explorar");
  const [compareA, setCompareA] = useState("ec");
  const [compareB, setCompareB] = useState("mx");
  const [features, setFeatures] = useState([]);
  const [mapError, setMapError] = useState("");
  const [policyCountryId, setPolicyCountryId] = useState("ec");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion || !("IntersectionObserver" in window)) return;

    const elements = [...document.querySelectorAll("[data-reveal]")];
    if (!elements.length) return;

    elements.forEach((element) => element.classList.add("reveal-pending"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [activeTab]);
  const knownSelected = countries.find(
    (country) => country.id === selectedId || country.iso === selectedId,
  );
  const selectedFeature = features.find(
    (feature) => feature.properties?.["ISO3166-1-Alpha-2"] === selectedId,
  );
  const selectedCountry =
    knownSelected ||
    (selectedFeature
      ? {
          id: selectedId,
          name: selectedFeature.properties.name,
          iso: selectedId,
          regionLabel: "Sin ficha comparable",
          values: {},
          summary: "",
          score: null,
          policy: {},
        }
      : null);
  const policyCountry =
    countries.find((country) => country.id === policyCountryId) || countries[0];

  const loadMap = async (signal) => {
    setMapError("");
    try {
      const response = await fetch(
        import.meta.env.BASE_URL + "world.geojson",
        signal ? { signal } : undefined,
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data.features))
        throw new Error("El archivo no tiene una lista de países.");
      const pathGenerator = geoPath(
        geoNaturalEarth1().fitExtent(
          [
            [8, 8],
            [892, 422],
          ],
          data,
        ),
      );
      setFeatures(
        data.features.map((feature) => ({
          ...feature,
          _path: pathGenerator(feature),
        })),
      );
    } catch (error) {
      if (error.name === "AbortError") return;
      setMapError(
        "No pudimos mostrar el mapa en este momento. Puedes seguir buscando países en el directorio e intentarlo de nuevo.",
      );
    }
  };
  useEffect(() => {
    const controller = new AbortController();
    loadMap(controller.signal);
    return () => controller.abort();
  }, []);
  const selectCountry = (iso) => {
    const country = countries.find((item) => item.iso === iso);
    setSelectedId(country?.id || iso);
    setPolicyCountryId(country?.id || iso);
  };
  const resetFilters = () => {
    setRegion("all");
    setDisorder("depression");
    setGroup("general");
    setYear("2026");
    setSearch("");
  };
  const changeTab = (tab) => {
    setActiveTab(tab);
    setMenuOpen(false);
    const reduceMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  };
  const openPolicy = () => {
    setPolicyCountryId(knownSelected?.id || "ec");
    changeTab("politicas");
  };
  const onAdminSaved = (country) => {
    if (country) setPolicyCountryId(country.id);
  };

  return (
    <div className="app-shell min-h-screen">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <header className="topbar sticky top-0 z-20 bg-[#f6f7f2]/95 backdrop-blur">
        <a
          className="brand"
          href="#inicio"
          onClick={(event) => {
            event.preventDefault();
            changeTab("explorar");
          }}
          aria-label="MentAtlas, ir al inicio"
        >
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            Ment<span>Atlas</span>
          </span>
        </a>
        <div className="topbar-meta">
          <i className="status-dot" />
          <span>Atlas de salud mental</span>
        </div>
        <button
          type="button"
          className="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="main-nav"
          aria-label={menuOpen ? "Ocultar secciones" : "Mostrar secciones"}
        >
          ☰
        </button>
      </header>
      <div className="layout-grid">
        <aside className="side-rail">
          <div className="side-intro">
            <span className="eyebrow">Atlas global</span>
            <p>
              Salud mental
              <br />
              con contexto.
            </p>
          </div>
          <nav
            className={`main-nav ${menuOpen ? "is-open" : ""}`}
            id="main-nav"
            aria-label="Secciones principales"
          >
            {[
              ["explorar", "01", "Explorar mapa"],
              ["politicas", "02", "Políticas públicas"],
              ["comparar", "03", "Comparar países"],
              ["metodologia", "04", "Metodología"],
              ["admin", "05", "Administración"],
            ]
              .filter(([tab]) => tab !== "admin" || content.showAdmin)
              .map(([tab, number, label]) => (
                <button
                  type="button"
                  key={tab}
                  className={`nav-item ${activeTab === tab ? "active" : ""}`}
                  aria-current={activeTab === tab ? "page" : undefined}
                  onClick={() => tab === "admin" ? window.location.assign(cmsUrl) : changeTab(tab)}
                >
                  <span>{number}</span>
                  {label}
                  <b aria-hidden="true">↗</b>
                </button>
              ))}
          </nav>
          <div className="rail-note">
            <span className="rail-note-mark">!</span>
            <p>
              Una herramienta informativa. No ofrece diagnóstico ni sustituye
              atención profesional.
            </p>
          </div>
        </aside>
        <main className="main-content" id="main-content" tabIndex="-1">
          {activeTab === "explorar" && (
            <>
              <section className="hero-block" id="inicio">
                <div className="hero-copy">
                  <p className="eyebrow">
                    Datos para comprender · políticas para actuar
                  </p>
                  <h1>
                    La salud mental
                    <br />
                    <em>tiene territorio.</em>
                  </h1>
                  <p className="hero-deck">{content.introduction}</p>
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() =>
                      document.getElementById("explorar")?.scrollIntoView({
                        behavior: window.matchMedia?.(
                          "(prefers-reduced-motion: reduce)",
                        ).matches
                          ? "auto"
                          : "smooth",
                      })
                    }
                  >
                    Abrir el atlas <span aria-hidden="true">↓</span>
                  </button>
                </div>
                <div className="hero-art" aria-hidden="true">
                  <div className="hero-aura" />
                  <div className="orbit orbit-one">
                    <i />
                  </div>
                  <div className="orbit orbit-two">
                    <i />
                  </div>
                  <div className="orbit orbit-three">
                    <i />
                  </div>
                  <div className="hero-globe">
                    <span className="globe-label">
                      SALUD
                      <br />
                      MENTAL
                    </span>
                    <span className="globe-ring globe-ring-one" />
                    <span className="globe-ring globe-ring-two" />
                    <i className="globe-point point-one" />
                    <i className="globe-point point-two" />
                    <i className="globe-point point-three" />
                    <i className="globe-point point-four" />
                  </div>
                  <span className="orbit-caption caption-one">01 · datos</span>
                  <span className="orbit-caption caption-two">
                    02 · bienestar
                  </span>
                  <span className="orbit-caption caption-three">
                    03 · políticas
                  </span>
                </div>
                <div className="hero-index">
                  MENTATLAS <span>01 — 05</span>
                </div>
              </section>
              <section
                className="signal-row"
                aria-label="Señales globales"
                data-reveal
              >
                <Metric value={countries.length} label="países en el directorio" note="Catálogo de MentAtlas"/>
                <Metric value={DISORDER_OPTIONS.length} label="indicadores de salud mental" note="Metodología del atlas"/>
                <Metric value={countries.filter(c=>safeSourceUrl(c.policy.link)).length} label="fichas con fuente de política pública" note="Enlaces disponibles en Políticas públicas"/>
              </section>
              <section
                className="content-section explore-section"
                id="explorar"
              >
                <div className="section-heading compact-heading" data-reveal>
                  <div>
                    <p className="eyebrow">01 / Mapa vivo</p>
                    <h2>
                      Elige un territorio.
                      <br />
                      <em>Empieza una lectura.</em>
                    </h2>
                  </div>
                  <p>
                    Una primera mirada a los datos y a su contexto. Cambia los
                    filtros o busca un país.
                  </p>
                </div>
                <div className="filter-panel panel" data-reveal>
                  <Field label="Región">
                    <select
                      value={region}
                      onChange={(event) => setRegion(event.target.value)}
                    >
                      {REGION_OPTIONS.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Indicador">
                    <select
                      value={disorder}
                      onChange={(event) => setDisorder(event.target.value)}
                    >
                      {DISORDER_OPTIONS.map(([value, item]) => (
                        <option key={value} value={value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Grupo poblacional">
                    <select
                      value={group}
                      onChange={(event) => setGroup(event.target.value)}
                    >
                      <option value="general">Población general</option>
                      <option value="women">Mujeres</option>
                      <option value="men">Hombres</option>
                    </select>
                  </Field>
                  <Field label="Año">
                    <select
                      value={year}
                      onChange={(event) => setYear(event.target.value)}
                    >
                      {years
                        .slice()
                        .reverse()
                        .map((value) => (
                          <option key={value}>{value}</option>
                        ))}
                    </select>
                  </Field>
                  <button
                    type="button"
                    className="reset-button"
                    onClick={resetFilters}
                  >
                    Restablecer
                  </button>
                </div>
                <p className="filter-notice" data-reveal>
                  Vista:{" "}
                  {group === "general"
                    ? "población general"
                    : group === "women"
                      ? "mujeres"
                      : "hombres"}{" "}
                  · {year} · referencias OMS / OPS / OWID. La selección de
                  fuente se consulta en cada ficha.
                </p>
                <div className="explore-grid">
                  <section
                    className="panel map-panel"
                    aria-label="Mapa de países"
                    data-reveal
                  >
                    <div className="map-panel-head">
                      <div>
                        <p className="eyebrow">Exploración en vivo</p>
                        <h3>Indicador por territorio</h3>
                      </div>
                      <span className="map-stats">
                        <b>{countries.length}</b> países con ficha
                      </span>
                    </div>
                    <MapView
                      features={features}
                      countries={countries}
                      selectedId={knownSelected?.id}
                      selectedIso={selectedCountry?.iso}
                      region={region}
                      disorder={disorder}
                      year={year}
                      group={group}
                      onSelect={selectCountry}
                      onRetry={loadMap}
                      error={mapError}
                    />
                    <p className="map-caption">
                      La intensidad indica disponibilidad de ficha, no nivel de
                      prevalencia.
                    </p>
                  </section>
                  <CountryPanel
                    country={selectedCountry}
                    year={year}
                    group={group}
                    disorder={disorder}
                    onYearChange={setYear}
                    onPolicy={openPolicy}
                  />
                </div>
                <div className="directory-row">
                  <Directory
                    countries={countries.filter(
                      (item) => region === "all" || item.region === region,
                    )}
                    selectedId={knownSelected?.id}
                    search={search}
                    setSearch={setSearch}
                    onSelect={selectCountry}
                  />
                  <div className="source-card" data-reveal>
                    <span className="source-card-icon" aria-hidden="true">
                      ↗
                    </span>
                    <p className="eyebrow">Leer con cuidado</p>
                    <h3>Los datos orientan preguntas.</h3>
                    <p>
                      Los métodos y los años no siempre son comparables. Abre la
                      metodología antes de interpretar diferencias.
                    </p>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => changeTab("metodologia")}
                    >
                      Ver metodología <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
          {activeTab === "comparar" && (
            <CompareView
              countries={countries}
              aId={compareA}
              bId={compareB}
              setAId={setCompareA}
              setBId={setCompareB}
              year={year}
              setYear={setYear}
              group={group}
              setGroup={setGroup}
            />
          )}
          {activeTab === "politicas" && (
            <PolicyView
              content={content}
              country={policyCountry}
              countries={countries}
              onCountryChange={(id) => setPolicyCountryId(id)}
              onEdit={content.showAdmin ? () => window.location.assign(cmsUrl) : null}
            />
          )}
          {activeTab === "metodologia" && <MethodView content={content} />}
          <footer className="page-footer">
            <div className="footer-brand">
              <span className="brand-mark" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span>
                Ment<span>Atlas</span>
              </span>
            </div>
            <p>
              Un prototipo editorial para explorar salud mental con contexto.
            </p>
            <span className="footer-version">Prototipo local · 2026</span>
            <p className="footer-disclaimer">
              Información orientativa; verifica siempre las fuentes originales.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
