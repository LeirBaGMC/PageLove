import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import {
  countries as baseCountries,
  disorders,
  regionProfiles,
  years,
  buildSeries,
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

function readStoredPolicies() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_POLICIES) || "{}");
  } catch {
    return {};
  }
}
function readStoredCountries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_COUNTRIES) || "[]");
  } catch {
    return [];
  }
}
function getInitialCountries() {
  const custom = readStoredCountries();
  return [
    ...baseCountries,
    ...custom.filter(
      (candidate) =>
        !baseCountries.some((country) => country.iso === candidate.iso),
    ),
  ];
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
          value:
            country?.series?.[year]?.[group]?.[disorder] ??
            country?.values?.[disorder],
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
          <IndicatorBars values={shownValues} selectedDisorder={disorder} />
          <div className="country-insights">
            <div>
              <strong>{higher}</strong>
              <span>indicador más alto</span>
            </div>
            <div>
              <strong>{country.score}/5</strong>
              <span>respuesta pública</span>
            </div>
          </div>
          <p className="caveat">
            Estimación orientativa para explorar órdenes de magnitud.
            Definiciones, años y métodos no son equivalentes entre países.
          </p>
          {Number.isFinite(country.score) ? (
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
      <p className="caveat wide-caveat">
        Las series anuales y por grupo poblacional son aproximaciones generadas
        para explorar tendencias. No sustituyen estadísticas oficiales
        comparables.
      </p>
    </section>
  );
}

function PolicyView({ country, countries, onCountryChange, onEdit }) {
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
        <span className="policy-badge">
          <i /> Revisión 2026
        </span>
      </div>
      {country ? (
        <article className="panel policy-card">
          <div className="policy-intro">
            <span className="country-code large-code">{country.iso}</span>
            <div>
              <p className="eyebrow">{country.regionLabel} · marco público</p>
              <h3>{country.name}</h3>
              <p>
                Actualización de referencia: {country.policy.updated || "2026"}
              </p>
            </div>
            <div className="score-block">
              <strong>{country.score}/5</strong>
              <span>respuesta pública</span>
            </div>
          </div>
          <div className="policy-focus">
            <span className="eyebrow">Enfoque principal</span>
            <p>{country.policy.plan}</p>
          </div>
          <div className="policy-grid">
            <div>
              <h4>Qué hace</h4>
              <p>{country.policy.actions}</p>
            </div>
            <div>
              <h4>Cómo se implementa</h4>
              <p>{country.policy.how}</p>
            </div>
            <div>
              <h4>Cobertura y brechas</h4>
              <p>{country.policy.coverage}</p>
            </div>
            <div>
              <h4>Indicadores de seguimiento</h4>
              <p>{country.policy.indicators}</p>
            </div>
          </div>
          <div className="policy-footer">
            {safeSourceUrl(country.policy.link) ? (
              <a
                href={safeSourceUrl(country.policy.link)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Fuente: {country.policy.source || "fuentes públicas"}{" "}
                <span aria-hidden="true">↗</span>
              </a>
            ) : (
              <span className="source-unavailable">
                Fuente: {country.policy.source || "fuentes públicas"}
              </span>
            )}
            <button type="button" className="text-button" onClick={onEdit}>
              Editar ficha local
            </button>
          </div>
        </article>
      ) : (
        <div className="panel empty-state">
          No hay una ficha de política para este país.
        </div>
      )}
    </section>
  );
}

function MethodView() {
  return (
    <section
      className="content-section"
      aria-labelledby="method-title"
      data-reveal
    >
      <div className="section-heading">
        <p className="eyebrow">04 / Metodología</p>
        <h2 id="method-title">Datos útiles, límites visibles.</h2>
        <p>
          Este atlas orienta una primera lectura. Cada cifra necesita contexto
          antes de convertirse en una conclusión.
        </p>
      </div>
      <div className="method-grid">
        <article className="panel method-card">
          <span className="method-number">01</span>
          <h3>Qué mide</h3>
          <p>
            Prevalencias indicativas de depresión, ansiedad, trastornos
            alimentarios, trastorno bipolar y esquizofrenia para explorar
            diferencias y órdenes de magnitud.
          </p>
        </article>
        <article className="panel method-card">
          <span className="method-number">02</span>
          <h3>De dónde viene</h3>
          <p>
            Referencias públicas de OMS, OPS, ministerios y OWID/GBD. Consulta
            las fuentes vinculadas en las fichas antes de reutilizar un dato.
          </p>
        </article>
        <article className="panel method-card">
          <span className="method-number">03</span>
          <h3>Qué no permite afirmar</h3>
          <p>
            Las definiciones, métodos, cobertura y años pueden diferir. Las
            cifras no sirven para diagnosticar, predecir casos individuales ni
            ordenar países como una clasificación oficial.
          </p>
        </article>
        <article className="panel method-card">
          <span className="method-number">04</span>
          <h3>Series temporales</h3>
          <p>
            Las curvas por año y grupo poblacional se presentan como
            aproximaciones exploratorias; no son estimaciones oficiales
            desagregadas para cada territorio.
          </p>
        </article>
      </div>
      <div className="source-strip panel">
        <div>
          <p className="eyebrow">Fuentes de referencia</p>
          <strong>OMS · OPS · OWID / GBD · ministerios de salud</strong>
        </div>
        <span>Consulta: 2026</span>
      </div>
    </section>
  );
}

function AdminView({ countries, setCountries, onPolicySaved }) {
  const [selectedId, setSelectedId] = useState(countries[0]?.id || "");
  const activeCountry =
    countries.find((item) => item.id === selectedId) || countries[0];
  const [form, setForm] = useState({});
  const [status, setStatus] = useState("");
  const [newCountry, setNewCountry] = useState({
    name: "",
    iso: "",
    region: "latam",
    depression: "4.9",
    anxiety: "6.5",
    eating: "0.4",
    bipolar: "0.7",
    schizophrenia: "0.3",
  });
  useEffect(() => {
    if (activeCountry) setForm({ ...activeCountry.policy });
  }, [activeCountry]);
  const update = (event) =>
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  const updateNewCountry = (event) =>
    setNewCountry((previous) => ({
      ...previous,
      [event.target.name]: event.target.value,
    }));
  const save = (event) => {
    event.preventDefault();
    const next = countries.map((item) =>
      item.id === activeCountry.id
        ? {
            ...item,
            policy: {
              ...item.policy,
              ...form,
              updated: new Date().getFullYear().toString(),
            },
          }
        : item,
    );
    setCountries(next);
    const policies = Object.fromEntries(
      next.map((item) => [item.id, item.policy]),
    );
    localStorage.setItem(STORAGE_POLICIES, JSON.stringify(policies));
    setStatus(`Ficha de ${activeCountry.name} guardada en este navegador.`);
    onPolicySaved(next.find((item) => item.id === activeCountry.id));
  };
  const exportData = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          Object.fromEntries(countries.map((item) => [item.id, item.policy])),
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = "mentatlas-politicas.json";
    link.click();
    URL.revokeObjectURL(href);
  };
  const importData = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const imported = JSON.parse(await file.text());
      const next = countries.map((item) =>
        imported[item.id]
          ? { ...item, policy: { ...item.policy, ...imported[item.id] } }
          : item,
      );
      setCountries(next);
      localStorage.setItem(STORAGE_POLICIES, JSON.stringify(imported));
      setStatus("Políticas importadas en este navegador.");
      onPolicySaved(next.find((item) => item.id === selectedId));
    } catch {
      setStatus(
        "No se pudo importar: el archivo no tiene un JSON válido de políticas.",
      );
    }
    event.target.value = "";
  };
  const addCountry = (event) => {
    event.preventDefault();
    const name = newCountry.name.trim();
    const iso = newCountry.iso.trim().toUpperCase();
    if (!name || !/^[A-Z]{2}$/.test(iso)) {
      setStatus("Escribe un nombre y un código ISO de dos letras.");
      return;
    }
    if (countries.some((item) => item.iso === iso)) {
      setStatus(`Ya existe una ficha para ${iso}.`);
      return;
    }
    const values = Object.fromEntries(
      Object.keys(disorders).map((key) => [key, Number(newCountry[key])]),
    );
    if (
      Object.values(values).some(
        (value) => !Number.isFinite(value) || value < 0 || value > 100,
      )
    ) {
      setStatus("Usa porcentajes válidos entre 0 y 100.");
      return;
    }
    const profile = regionProfiles[newCountry.region];
    const country = {
      id: iso.toLowerCase(),
      name,
      iso,
      region: newCountry.region,
      regionLabel: profile.label,
      values,
      summary: "Ficha añadida localmente para exploración.",
      dataYear: 2023,
      series: buildSeries(values),
      score: profile.score,
      isCustom: true,
      policy: { ...profile, year: 2026, updated: "2026" },
    };
    const next = [...countries, country];
    setCountries(next);
    localStorage.setItem(
      STORAGE_COUNTRIES,
      JSON.stringify(next.filter((item) => item.isCustom)),
    );
    setSelectedId(country.id);
    setForm({ ...country.policy });
    setStatus(`${name} se añadió a este navegador.`);
    setNewCountry((previous) => ({ ...previous, name: "", iso: "" }));
  };
  return (
    <section
      className="content-section"
      aria-labelledby="admin-title"
      data-reveal
    >
      <div className="section-heading">
        <p className="eyebrow">05 / Administración local</p>
        <h2 id="admin-title">Mantén las fichas de política.</h2>
        <p>
          Los cambios se guardan solo en este navegador. Esta pantalla no
          implementa autenticación de servidor.
        </p>
      </div>
      <div className="admin-actions panel">
        <Field label="País que vas a editar">
          <select
            value={activeCountry?.id || ""}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {countries.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="admin-action-buttons">
          <button
            type="button"
            className="button button-outline"
            onClick={exportData}
          >
            Exportar JSON
          </button>
          <label className="button button-soft file-button">
            Importar JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={importData}
              aria-label="Importar políticas desde un archivo JSON"
            />
          </label>
        </div>
      </div>
      {activeCountry && (
        <form className="panel admin-form" onSubmit={save}>
          <h3 className="admin-form-title">
            Editar políticas · {activeCountry.name}
          </h3>
          <div className="form-grid">
            <Field label="Resumen del enfoque">
              <textarea
                name="plan"
                value={form.plan || ""}
                onChange={update}
                rows="2"
                required
              />
            </Field>
            <Field label="Fuente">
              <input
                name="source"
                value={form.source || ""}
                onChange={update}
              />
            </Field>
            <Field label="Enlace de fuente">
              <input
                name="link"
                type="url"
                value={form.link || ""}
                onChange={update}
              />
            </Field>
            <Field label="Acciones">
              <textarea
                name="actions"
                value={form.actions || ""}
                onChange={update}
                rows="3"
              />
            </Field>
            <Field label="Implementación">
              <textarea
                name="how"
                value={form.how || ""}
                onChange={update}
                rows="3"
              />
            </Field>
            <Field label="Cobertura y brechas">
              <textarea
                name="coverage"
                value={form.coverage || ""}
                onChange={update}
                rows="3"
              />
            </Field>
            <Field label="Indicadores de seguimiento">
              <textarea
                name="indicators"
                value={form.indicators || ""}
                onChange={update}
                rows="3"
              />
            </Field>
          </div>
          <div className="form-footer">
            <p aria-live="polite">{status}</p>
            <button className="button button-primary" type="submit">
              Guardar cambios
            </button>
          </div>
        </form>
      )}
      <form className="panel admin-form add-country-form" onSubmit={addCountry}>
        <div className="admin-subhead">
          <div>
            <p className="eyebrow">Nueva ficha</p>
            <h3>Añadir país al atlas</h3>
          </div>
          <span className="field-hint">Se conserva en este navegador.</span>
        </div>
        <div className="form-grid">
          <Field label="Nombre">
            <input
              name="name"
              value={newCountry.name}
              onChange={updateNewCountry}
              required
            />
          </Field>
          <Field label="Código ISO-2">
            <input
              name="iso"
              value={newCountry.iso}
              onChange={updateNewCountry}
              maxLength="2"
              pattern="[A-Za-z]{2}"
              required
            />
          </Field>
          <Field label="Región">
            <select
              name="region"
              value={newCountry.region}
              onChange={updateNewCountry}
            >
              {Object.entries(regionProfiles).map(([key, profile]) => (
                <option key={key} value={key}>
                  {profile.label}
                </option>
              ))}
            </select>
          </Field>
          {DISORDER_OPTIONS.map(([key, item]) => (
            <Field key={key} label={`${item.label} (%)`}>
              <input
                name={key}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={newCountry[key]}
                onChange={updateNewCountry}
                required
              />
            </Field>
          ))}
        </div>
        <div className="form-footer">
          <span />
          <button className="button button-outline" type="submit">
            Añadir ficha
          </button>
        </div>
      </form>
    </section>
  );
}

function App() {
  const [countries, setCountries] = useState(getInitialCountries);
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
        "/world.geojson",
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
  useEffect(() => {
    const saved = readStoredPolicies();
    if (Object.keys(saved).length)
      setCountries((items) =>
        items.map((item) =>
          saved[item.id]
            ? { ...item, policy: { ...item.policy, ...saved[item.id] } }
            : item,
        ),
      );
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
          <span>Fuentes revisadas hasta 2026</span>
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
            ].map(([tab, number, label]) => (
              <button
                type="button"
                key={tab}
                className={`nav-item ${activeTab === tab ? "active" : ""}`}
                aria-current={activeTab === tab ? "page" : undefined}
                onClick={() => changeTab(tab)}
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
                  <p className="hero-deck">
                    Explora cómo se distribuyen los trastornos más frecuentes y
                    qué respuestas de salud pública los acompañan.
                  </p>
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
                <Metric
                  value=">1 B"
                  label="personas viven con un trastorno mental"
                  note="estimación global OMS"
                />
                <Metric
                  value="77,9%"
                  label="brecha de tratamiento en América Latina y el Caribe"
                  note="referencia OPS"
                />
                <Metric
                  value="2,1%"
                  label="del presupuesto sanitario regional va a salud mental"
                  note="referencia OPS"
                />
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
              country={policyCountry}
              countries={countries}
              onCountryChange={(id) => setPolicyCountryId(id)}
              onEdit={() => changeTab("admin")}
            />
          )}
          {activeTab === "metodologia" && <MethodView />}
          {activeTab === "admin" && (
            <AdminView
              countries={countries}
              setCountries={setCountries}
              onPolicySaved={onAdminSaved}
            />
          )}
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
