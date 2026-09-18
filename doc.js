/* 數位辦公室(內網版) 文件互動：目錄開合、表格排序與查詢 */
function toggleSidebar() {
    document.getElementById('mySidebar').classList.toggle('collapsed');
}
function toggleChapter(button) {button.parentElement.classList.toggle('active');}

// ── 表格：排序 + 單表查詢 ───────────────────────────────
// 自動套用到 .main-content 內每一個 <table>，各表格的查詢只作用於自己。
// 關閉方式：<table data-search="off"> 關查詢、<table data-sortable="off"> 關排序、
//           <th data-nosort> 關閉單一欄排序、<td data-sort="值"> 指定該格排序用的值。
(function () {
    var collator = new Intl.Collator('zh-Hant', { numeric: true, sensitivity: 'base' });

    function cellText(row, idx) {
        var cell = row.cells[idx];
        if (!cell) return '';
        return cell.hasAttribute('data-sort') ? cell.getAttribute('data-sort') : cell.textContent;
    }

    function asNumber(text) {
        var v = String(text).replace(/[,\s%]/g, '');
        if (v === '') return null;
        return isNaN(v) ? null : parseFloat(v);
    }

    function enhance(table) {
        if (table.dataset.enhanced) return;
        table.dataset.enhanced = '1';

        var tbody = table.tBodies[0];
        var thead = table.tHead;
        if (!tbody || !thead || !thead.rows.length) return;

        var headRow = thead.rows[thead.rows.length - 1];
        var rows = Array.prototype.slice.call(tbody.rows);
        if (!rows.length) return;
        rows.forEach(function (r, i) { r.dataset.origIndex = i; });

        // 外層捲動容器
        var wrap = table.closest('.table-wrap');
        if (!wrap) {
            wrap = document.createElement('div');
            wrap.className = 'table-wrap';
            table.parentNode.insertBefore(wrap, table);
            wrap.appendChild(table);
        }

        // 查無資料時顯示的列
        var emptyRow = document.createElement('tr');
        emptyRow.className = 'table-empty';
        var emptyCell = document.createElement('td');
        emptyCell.colSpan = headRow.cells.length;
        emptyCell.textContent = '找不到符合的資料';
        emptyRow.appendChild(emptyCell);
        emptyRow.style.display = 'none';
        tbody.appendChild(emptyRow);

        var countEl = null;

        function restripe() {
            var n = 0;
            rows.forEach(function (r) {
                if (r.style.display === 'none') {
                    r.classList.remove('row-even', 'row-odd');
                    return;
                }
                r.classList.toggle('row-even', n % 2 === 1);
                r.classList.toggle('row-odd', n % 2 === 0);
                n++;
            });
            emptyRow.style.display = n === 0 ? '' : 'none';
            if (countEl) {
                countEl.textContent = n === rows.length
                    ? '共 ' + rows.length + ' 筆'
                    : '顯示 ' + n + ' / ' + rows.length + ' 筆';
                countEl.classList.toggle('filtered', n !== rows.length);
            }
            return n;
        }

        // ── 查詢（僅限本表格）──
        if (table.dataset.search !== 'off') {
            var toolbar = document.createElement('div');
            toolbar.className = 'table-toolbar';

            var box = document.createElement('span');
            box.className = 'table-search-box';

            var input = document.createElement('input');
            input.type = 'search';
            input.className = 'table-search';
            input.placeholder = table.dataset.searchPlaceholder || '在此表格中搜尋…';
            input.setAttribute('aria-label', '在此表格中搜尋');

            var clearBtn = document.createElement('button');
            clearBtn.type = 'button';
            clearBtn.className = 'table-search-clear';
            clearBtn.textContent = '✕';
            clearBtn.setAttribute('aria-label', '清除搜尋');

            countEl = document.createElement('span');
            countEl.className = 'table-count';

            box.appendChild(input);
            box.appendChild(clearBtn);
            toolbar.appendChild(box);
            toolbar.appendChild(countEl);
            wrap.parentNode.insertBefore(toolbar, wrap);

            function applyFilter() {
                var q = input.value.trim().toLowerCase();
                box.classList.toggle('has-value', q !== '');
                rows.forEach(function (r) {
                    r.style.display = (q === '' || r.textContent.toLowerCase().indexOf(q) !== -1) ? '' : 'none';
                });
                restripe();
            }

            input.addEventListener('input', applyFilter);
            clearBtn.addEventListener('click', function () {
                input.value = '';
                applyFilter();
                input.focus();
            });
            table.tableFilter = applyFilter;
        }

        // ── 排序 ──
        if (table.dataset.sortable !== 'off') {
            Array.prototype.forEach.call(headRow.cells, function (th, idx) {
                if (th.hasAttribute('data-nosort')) return;

                th.classList.add('sortable');
                th.tabIndex = 0;
                th.setAttribute('aria-sort', 'none');

                var ind = document.createElement('span');
                ind.className = 'sort-ind';
                ind.setAttribute('aria-hidden', 'true');
                ind.innerHTML = '<span class="sort-up">▲</span><span class="sort-down">▼</span>';
                th.appendChild(ind);

                function doSort() {
                    var asc = !th.classList.contains('sort-asc');

                    Array.prototype.forEach.call(headRow.cells, function (other) {
                        other.classList.remove('sort-asc', 'sort-desc');
                        if (other.classList.contains('sortable')) other.setAttribute('aria-sort', 'none');
                    });
                    th.classList.add(asc ? 'sort-asc' : 'sort-desc');
                    th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');

                    var numeric = rows.every(function (r) {
                        var t = cellText(r, idx).trim();
                        return t === '' || asNumber(t) !== null;
                    });

                    var sorted = rows.slice().sort(function (a, b) {
                        var ta = cellText(a, idx).trim();
                        var tb = cellText(b, idx).trim();
                        var res;
                        if (ta === '' && tb === '') res = 0;
                        else if (ta === '') res = 1;          // 空值永遠排最後
                        else if (tb === '') res = -1;
                        else if (numeric) res = asNumber(ta) - asNumber(tb);
                        else res = collator.compare(ta, tb);
                        if (ta === '' || tb === '') return res;      // 空值永遠排最後
                        if (res !== 0) return asc ? res : -res;
                        return a.dataset.origIndex - b.dataset.origIndex;   // 同值維持原順序
                    });

                    sorted.forEach(function (r) { tbody.appendChild(r); });
                    tbody.appendChild(emptyRow);
                    rows = sorted;
                    restripe();
                }

                th.addEventListener('click', doSort);
                th.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); doSort(); }
                });
            });
        }

        restripe();
    }

    function initTables() {
        document.querySelectorAll('.main-content table').forEach(enhance);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initTables);
    } else {
        initTables();
    }
    window.initTables = initTables;   // 之後動態新增表格時可再呼叫一次
})();

// 左側點擊各節 → 右側面板以 ease 動畫捲動
document.addEventListener('DOMContentLoaded', function () {
    const container = document.querySelector('.main-content');
    const OFFSET = 20;        // 捲動後標題距離面板頂端的留白
    const MIN_MS = 350;       // 動畫最短時間
    const MAX_MS = 900;       // 動畫最長時間
    const PX_PER_MS = 1.6;    // 距離換算速度，越小動畫越慢

    let animId = null;

    // ease-in-out cubic：起步慢 → 中段快 → 收尾慢
    function ease(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function animateScrollTo(destination) {
        if (animId !== null) cancelAnimationFrame(animId);

        const start = container.scrollTop;
        const maxTop = container.scrollHeight - container.clientHeight;
        const end = Math.max(0, Math.min(destination, maxTop));
        const delta = end - start;

        if (Math.abs(delta) < 1) { container.scrollTop = end; return; }

        const duration = Math.min(MAX_MS, Math.max(MIN_MS, Math.abs(delta) / PX_PER_MS));
        const startTime = performance.now();

        function step(now) {
            const t = Math.min(1, (now - startTime) / duration);
            container.scrollTop = start + delta * ease(t);
            if (t < 1) {
                animId = requestAnimationFrame(step);
            } else {
                animId = null;
            }
        }
        animId = requestAnimationFrame(step);
    }

    document.querySelectorAll('.section-menu').forEach(function (menu) {
        const links = menu.querySelectorAll('a');

        links.forEach(function (link, index) {
            link.addEventListener('click', function (e) {
                const section = document.querySelector(link.getAttribute('href'));
                if (!section) return;
                e.preventDefault();

                // 第 1 節 → 捲到該章開頭（含章標題）；第 2~N 節 → 捲到該節開頭
                const target = (index === 0 && section.closest('.content-chapter'))
                             ? section.closest('.content-chapter')
                             : section;

                const destination = container.scrollTop
                                  + target.getBoundingClientRect().top
                                  - container.getBoundingClientRect().top
                                  - OFFSET;

                animateScrollTo(destination);
            });
        });
    });
});

