// MonthA.jsx — Direction A: Clean TW-native month calendar
// Big cells, horizontal continuous event bars. Weekend on-call primary /
// secondary names are rendered directly inside the Saturday and Sunday
// day cells (no extra column).

function MonthA({ monthDate, events, employees = EMPLOYEES, coverage = WEEKEND_COVERAGE, holidays = HOLIDAYS, tier2 = TIER2_ONCALL, employeeFilter, typeFilter, onOpenEvent, onAddAt, onWeekendCoverageAt, onOpenContact }) {
    const weeks = buildMonthGrid(monthDate, 0); // Sunday start

    const visibleEvents = events.filter(e =>
        (employeeFilter === "all" || e.employeeId === employeeFilter) &&
        (typeFilter === "all" || e.type === typeFilter)
    );

    // The Tier 2 rotation runs Monday–Sunday. Each week row in our grid
    // starts on Sunday, so the "active" Monday for that row is week[1].
    // Build the key from local components — using iso() (toISOString) would
    // shift by a day in negative UTC offsets and miss the TIER2 entries.
    const localKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const tier2ForWeek = (week) => tier2[localKey(week[1])] || null;

    // Per-week event layout: each event gets a lane within the week segment
    // it intersects (greedy, earliest start wins).
    // Weekends are coverage-only — we never draw event bars over Sat/Sun
    // cells, so a Mon→Sun vacation is split into a single Mon–Fri segment
    // (and a multi-week vacation produces one weekday-only segment per
    // week). We do this by collecting the weekday day-indices the event
    // covers, then grouping them into contiguous runs.
    const weekSegments = weeks.map(week => {
        const weekStart = week[0], weekEnd = week[6];
        const segs = [];
        for (const ev of visibleEvents) {
            const s = ev.start > weekStart ? ev.start : weekStart;
            const e = ev.end < weekEnd ? ev.end : weekEnd;
            if (e < weekStart || s > weekEnd) continue;
            const startIdx = Math.round((new Date(s.getFullYear(), s.getMonth(), s.getDate()) - weekStart) / 86400000);
            const endIdx = Math.round((new Date(e.getFullYear(), e.getMonth(), e.getDate()) - weekStart) / 86400000);
            // Sunday-start grid → indices 0 (Sun) and 6 (Sat) are weekends.
            const weekdayIdxs = [];
            for (let i = startIdx; i <= endIdx; i++) {
                if (i === 0 || i === 6) continue;
                weekdayIdxs.push(i);
            }
            if (weekdayIdxs.length === 0) continue;
            // Split into contiguous runs (always contiguous here since the
            // only gap is between Fri and Mon, but the loop is defensive).
            let runStart = weekdayIdxs[0];
            for (let k = 0; k < weekdayIdxs.length; k++) {
                const cur = weekdayIdxs[k];
                const next = weekdayIdxs[k + 1];
                if (next !== cur + 1) {
                    const runEnd = cur;
                    segs.push({
                        ev, startIdx: runStart, endIdx: runEnd,
                        // Bar visually continues left if either the event started
                        // before this week, OR if the run starts on Mon (idx 1) and
                        // the event itself started on Sunday or earlier.
                        continuesLeft: ev.start < weekStart || (runStart === 1 && startIdx === 0),
                        continuesRight: ev.end > weekEnd || (runEnd === 5 && endIdx === 6),
                    });
                    runStart = next;
                }
            }
        }
        segs.sort((a, b) => a.startIdx - b.startIdx || b.endIdx - a.endIdx);

        const laneIntervals = [];
        const conflicts = (lane, s, e) =>
            (laneIntervals[lane] || []).some(r => r.s <= e && r.e >= s);

        for (const seg of segs) {
            let lane = 0;
            while (conflicts(lane, seg.startIdx, seg.endIdx)) lane++;
            seg.lane = lane;
            (laneIntervals[lane] = laneIntervals[lane] || []).push({ s: seg.startIdx, e: seg.endIdx });
        }

        // Compute per-segment holiday row count (max across the days it spans).
        for (const seg of segs) {
            seg.segHols = 0;
            for (let col = seg.startIdx; col <= seg.endIdx; col++) {
                if (col === 0 || col === 6) continue;
                const h = holidays[iso(week[col])];
                if (h) seg.segHols = Math.max(seg.segHols, h.length);
            }
        }
        // Normalize segHols within each connected component of overlapping segments
        // so lane 0 always renders above lane 1 on shared days.
        const seen = new Set();
        for (let i = 0; i < segs.length; i++) {
            if (seen.has(i)) continue;
            const group = [i];
            seen.add(i);
            for (let qi = 0; qi < group.length; qi++) {
                const ci = group[qi];
                for (let j = 0; j < segs.length; j++) {
                    if (seen.has(j)) continue;
                    if (segs[ci].startIdx <= segs[j].endIdx && segs[ci].endIdx >= segs[j].startIdx) {
                        seen.add(j);
                        group.push(j);
                    }
                }
            }
            const groupHols = Math.max(...group.map(k => segs[k].segHols));
            for (const k of group) segs[k].segHols = groupHols;
        }

        return segs;
    });

    const GRID_COLS = "repeat(7, 1fr) 160px";
    const TIER2_COL = 160;

    return (
        <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border-weak)", borderRadius: "var(--r-lg)", overflow: "hidden" }}>
            {/* DOW header — 7 day columns + Tier 2 header cell */}
            <div style={{ display: "grid", gridTemplateColumns: GRID_COLS, background: "var(--bg-page)", borderBottom: "1px solid var(--border-weak)" }}>
                {DOW_SHORT_SU.map((d, i) => {
                    const isWeekend = i === 0 || i === 6;
                    return (
                        <div key={d} style={{
                            padding: "10px 12px",
                            fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
                            textTransform: "uppercase", letterSpacing: ".08em", color: "var(--fg-2)",
                            borderRight: "1px solid var(--border-weak)",
                            background: isWeekend ? "var(--tw-gray-6)" : "transparent",
                            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8
                        }}>
                            <span>{d}</span>
                            {isWeekend && (
                                <span style={{ fontSize: 9, fontWeight: 600, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: ".06em" }}>
                                    Coverage
                                </span>
                            )}
                        </div>
                    );
                })}
                <div style={{
                    padding: "8px 12px",
                    fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
                    textTransform: "uppercase", letterSpacing: ".08em", color: "var(--fg-2)",
                    background: "var(--tw-gray-6)",
                    display: "flex", flexDirection: "column", justifyContent: "center", lineHeight: 1.25,
                }}>
                    <span>Tier 2 on-call</span>
                    <span style={{ fontSize: 9, fontWeight: 500, color: "var(--fg-3)", letterSpacing: ".04em", textTransform: "none" }}>Mon – Sun</span>
                </div>
            </div>

            {weeks.map((week, wi) => {
                const t2 = tier2ForWeek(week);
                const isCurrentWeek = week.some(d => sameDay(d, TODAY));
                // Unified Tier 2 styling: same font color for everyone, neutral surface
                // by default, light green when this week is the current week.
                const tint = t2 ? {
                    bg: isCurrentWeek ? "#E6F6E8" : "var(--bg-surface)",
                    fg: "var(--fg-1)",
                    border: isCurrentWeek ? "#9ED8A6" : "var(--border-weak)",
                } : null;
                const _maxLanes = weekSegments[wi].length > 0 ? Math.max(...weekSegments[wi].map(s => s.lane)) + 1 : 0;
                const _maxHols = week.reduce((m, d, di) => (di === 0 || di === 6) ? m : Math.max(m, (holidays[iso(d)] || []).length), 0);
                const rowMinHeight = Math.max(140, 28 + _maxHols * 26 + 4 + (_maxLanes > 0 ? 4 + _maxLanes * 24 + 6 : 0));

                return (
                    <div key={wi} style={{
                        display: "grid", gridTemplateColumns: GRID_COLS,
                        borderBottom: wi < weeks.length - 1 ? "1px solid var(--border-weak)" : "none",
                        minHeight: rowMinHeight, position: "relative"
                    }}>
                        {/* day cells */}
                        {week.map((day, di) => {
                            const inMonth = day.getMonth() === monthDate.getMonth();
                            const isToday = sameDay(day, TODAY);
                            const isWeekend = di === 0 || di === 6;
                            const cov = isWeekend && inMonth ? coverage[iso(day)] : null;
                            return (
                                <div key={di} onClick={() => {
                                    if (!inMonth) return;
                                    if (isWeekend && onWeekendCoverageAt) onWeekendCoverageAt(day);
                                    else onAddAt(day);
                                }} style={{
                                    borderRight: "1px solid var(--border-weak)",
                                    background: isWeekend && inMonth ? "var(--tw-gray-6)" : "var(--bg-surface)",
                                    padding: "8px 10px 10px", cursor: inMonth ? "pointer" : "default", position: "relative",
                                    opacity: inMonth ? 1 : 0.45,
                                    display: "flex", flexDirection: "column"
                                }}>
                                    <div style={{
                                        display: "inline-flex", alignItems: "center", justifyContent: "center",
                                        minWidth: 20, height: 20, padding: "0 5px", borderRadius: "var(--r-pill)",
                                        fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: isToday ? 700 : 500,
                                        background: isToday ? "var(--action-primary)" : "transparent",
                                        color: isToday ? "var(--fg-invert)" : "var(--fg-1)",
                                        alignSelf: "flex-start"
                                    }}>{day.getDate()}</div>

                                    {/* Holiday chips for this day */}
                                    {inMonth && <HolidayChips items={holidays[iso(day)]} />}

                                    {/* Weekend on-call — two shift rows stacked at the bottom */}
                                    {isWeekend && inMonth && (
                                        <div style={{
                                            marginTop: "auto", paddingTop: 6,
                                            display: "flex", flexDirection: "column",
                                            borderTop: "1px solid var(--border-weak)"
                                        }}>
                                            {SHIFTS.map((sh, si) => {
                                                const slot = cov && cov[sh.id];
                                                const name = slot ? slot.name : null;
                                                return (
                                                    <div key={sh.id} style={{
                                                        padding: "5px 0 4px",
                                                        borderTop: si > 0 ? "1px dashed var(--border-weak)" : "none",
                                                        display: "flex", flexDirection: "column", gap: 1, lineHeight: 1.2
                                                    }}>
                                                        <div style={{
                                                            fontSize: 10, fontWeight: 600, color: "var(--fg-3)",
                                                            letterSpacing: ".03em",
                                                            fontVariantNumeric: "tabular-nums"
                                                        }}>{sh.label}</div>
                                                        <div style={{
                                                            fontSize: 12,
                                                            color: name ? "var(--fg-1)" : "var(--fg-3)",
                                                            fontWeight: name ? 600 : 500,
                                                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                                                        }}
                                                            title={slot ? `${name} · ${slot.start}–${slot.end}${slot.timezone ? " " + slot.timezone : ""}` : "Unassigned"}>
                                                            {name || "—"}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* event bars overlay — spans only the 7 day columns, not the
              Tier 2 column. Width = 100% - TIER2 col so percentages map.

              Layout order per cell column:
                1. Holiday chips  (rendered inside the day cell, above this overlay)
                2. Employee leave bars — one per row, no two employees share a lane

              To avoid overlapping holiday chips we calculate the max number of
              holiday entries across all weekday cells in this week and push the
              overlay down by that many chip rows (each chip is ~22 px tall). */}
                        {(() => {
                            // Build a per-column holiday count array (indices 0–6).
                            const CHIP_H = 26;
                            const DATE_ROW_H = 28;
                            const colHolidayRows = week.map((day, di) => {
                                if (di === 0 || di === 6) return 0; // weekends have no chips
                                const h = holidays[iso(day)];
                                return h ? h.length : 0;
                            });

                            return (
                                <div style={{ position: "absolute", top: 0, left: 0, right: `${TIER2_COL}px`, pointerEvents: "none" }}>
                                    {weekSegments[wi].map((s, idx) => {
                                        const type = LEAVE_TYPES[s.ev.type];
                                        const emp = EMPLOYEES.find(e => e.id === s.ev.employeeId) || { name: s.ev.fullName || "Unknown", initials: "?" };
                                        const leftPct = (s.startIdx / 7) * 100;
                                        const widthPct = ((s.endIdx - s.startIdx + 1) / 7) * 100;
                                        const segOverlayTop = DATE_ROW_H + s.segHols * CHIP_H + 4;
                                        return (
                                            <div key={s.ev.id + idx} onClick={(e) => { e.stopPropagation(); onOpenEvent(s.ev); }}
                                                title={`${emp.name} · ${type.label}`}
                                                style={{
                                                    position: "absolute",
                                                    left: `calc(${leftPct}% + 4px)`,
                                                    width: `calc(${widthPct}% - 8px)`,
                                                    top: segOverlayTop + 4 + s.lane * 24,
                                                    height: 20,
                                                    background: type.bar,
                                                    color: "#fff",
                                                    borderRadius: 3,
                                                    padding: "0 8px",
                                                    display: "flex", alignItems: "center",
                                                    fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 600,
                                                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                                    cursor: "pointer", pointerEvents: "auto",
                                                    boxShadow: "0 1px 0 rgba(0,0,0,0.04)",
                                                    borderTopLeftRadius: s.continuesLeft ? 0 : 3,
                                                    borderBottomLeftRadius: s.continuesLeft ? 0 : 3,
                                                    borderTopRightRadius: s.continuesRight ? 0 : 3,
                                                    borderBottomRightRadius: s.continuesRight ? 0 : 3,
                                                }}>
                                                {s.continuesLeft ? "…" : ""} {abbrevName(emp.name)} · {type.label}
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}

                        {/* Tier 2 weekly on-call card — full-height, spans the whole row.
              Clickable when an assignee exists; opens a contact-details popover. */}
                        <div
                            onClick={t2 && onOpenContact ? () => onOpenContact(t2.fullName) : undefined}
                            style={{
                                background: tint ? tint.bg : "var(--bg-surface)",
                                color: tint ? tint.fg : "var(--fg-3)",
                                borderLeft: "1px solid var(--border-weak)",
                                display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center",
                                padding: "10px 12px", textAlign: "center", lineHeight: 1.25,
                                fontFamily: "var(--font-ui)",
                                cursor: t2 && onOpenContact ? "pointer" : "default",
                                transition: "background 120ms",
                            }}
                            title={t2 ? `Click to view ${t2.fullName}'s contact details` : "No Tier 2 assignment"}>
                            {t2 ? (
                                <>
                                    <div style={{
                                        fontSize: 9, fontWeight: 600, letterSpacing: ".06em",
                                        textTransform: "uppercase", opacity: 0.75, marginBottom: 4
                                    }}>
                                        Tier 2
                                    </div>
                                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>
                                        {t2.fullName}
                                    </div>
                                </>
                            ) : (
                                <div style={{ fontSize: 11, color: "var(--fg-3)" }}>—</div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

Object.assign(window, { MonthA });
