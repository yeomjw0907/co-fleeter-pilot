/**
 * Co-Fleeter Export Module
 * PDF and Excel export functionality
 */

class ExportManager {
    constructor() {
        this.jsPDF = null;
        this.XLSX = null;
    }

    /**
     * Check if libraries are loaded
     */
    checkLibraries() {
        if (typeof window.jspdf === 'undefined') {
            const msg = 'PDF library not loaded. Please refresh the page.';
            if (typeof toast !== 'undefined') toast.error(msg);
            else alert(msg);
            return false;
        }
        if (typeof XLSX === 'undefined') {
            const msg = 'Excel library not loaded. Please refresh the page.';
            if (typeof toast !== 'undefined') toast.error(msg);
            else alert(msg);
            return false;
        }
        return true;
    }

    /**
     * Export calculation result to PDF
     * @param {Object} calculation - Calculation data
     */
    exportToPDF(calculation) {
        if (!this.checkLibraries()) return;

        try {
            // UMD Patch: Fix for autoTable looking for window.jsPDF
            if (window.jspdf && window.jspdf.jsPDF && !window.jsPDF) {
                window.jsPDF = window.jspdf.jsPDF;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Validate autoTable availability
            if (typeof doc.autoTable !== 'function') {
                console.warn("AutoTable plugin not loaded properly.");
            }

            // --- Header ---
            doc.setFontSize(22);
            doc.setTextColor(14, 165, 233); // Brand Blue
            doc.text('Co-Fleeter', 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text('Maritime Decarbonization Platform', 14, 25);

            doc.setFontSize(10);
            doc.setTextColor(0);
            doc.text(`Report Generated: ${new Date().toISOString().slice(0, 10)}`, 150, 20);

            doc.setDrawColor(200);
            doc.line(14, 30, 196, 30);

            const inputs = calculation.inputs || {};
            const result = calculation.result || {};
            let currentY = 40;

            // --- 1. Basic Data (Side-by-Side Tables) ---
            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.text('1. Basic Data', 14, currentY);
            currentY += 5;

            // Left Table Data (Ship Details)
            const leftBody = [
                ['Ship\'s Name', inputs.vesselName || '-'],
                ['IMO NO', inputs.imoNumber || '-'],
                ['SHIP\'S TYPE', inputs.shipType || '-'],
                ['DWT or GT', (inputs.dwt ? inputs.dwt.toLocaleString() : '-')],
                ['Voyage Dist.', (inputs.distance ? inputs.distance.toLocaleString() + ' nm' : '-')]
            ];

            // Right Table Data (CII Details)
            const rightBody = [
                ['Calculation Year', inputs.year || '-'],
                ['Required CII', result.requiredCII || '-'],
                ['Attained CII', result.attainedCII || '-'],
                ['Grade', result.rating || '-']
            ];

            if (doc.autoTable) {
                // Render Left Table
                doc.autoTable({
                    startY: currentY,
                    body: leftBody,
                    theme: 'grid',
                    styles: { fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1 },
                    headStyles: { fillColor: [255, 255, 255], textColor: 0, fontStyle: 'bold' },
                    columnStyles: { 0: { fontStyle: 'bold', width: 40, fillColor: [255, 255, 255] } }, // First col bold
                    margin: { left: 14 },
                    tableWidth: 110
                });

                const leftFinalY = doc.lastAutoTable.finalY;

                // Render Right Table (Next to Left Table)
                doc.autoTable({
                    startY: currentY,
                    body: rightBody,
                    theme: 'grid',
                    styles: { fontSize: 9, cellPadding: 1.5, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center' },
                    columnStyles: { 0: { fontStyle: 'bold', fillColor: [240, 240, 240], width: 35 } },
                    margin: { left: 130 }, // 14 + 110 + GAP
                    tableWidth: 66
                });

                const rightFinalY = doc.lastAutoTable.finalY;

                // Continue from below the taller table
                currentY = Math.max(leftFinalY, rightFinalY) + 15;

            } else {
                doc.text("Tables could not be rendered (AutoTable missing).", 14, currentY + 10);
                currentY += 20;
            }

            // --- 2. Fuel Consumption ---
            doc.text('2. Fuel Consumption', 14, currentY);
            currentY += 5;

            const fuelBody = (calculation.fuels || []).map(f => [
                f.type || '-',
                f.amount ? f.amount.toFixed(1) : '0.0',
                ''
            ]);
            // Optional: Fill empty rows to maintain visual consistency
            while (fuelBody.length < 5) fuelBody.push(['N/A', '-', '']);

            if (doc.autoTable) {
                doc.autoTable({
                    startY: currentY,
                    head: [['Fuel', 'Fuel Cons. [ton]', 'Remark']],
                    body: fuelBody,
                    theme: 'grid',
                    styles: { fontSize: 9, lineColor: [0, 0, 0], lineWidth: 0.1, halign: 'center' },
                    headStyles: { fillColor: [173, 216, 230], textColor: 0, fontStyle: 'bold' },
                    columnStyles: { 0: { halign: 'center', fillColor: [255, 240, 230] } },
                    margin: { left: 14, right: 14 }
                });
                currentY = doc.lastAutoTable.finalY + 15;
            }

            // --- 3. CII Chart ---
            doc.text('3. CII Prediction (10 Years)', 14, currentY);
            currentY += 10;

            const chartHeight = 80;
            const chartWidth = 180;
            const chartX = 14;

            // Check page break if chart doesn't fit
            if (currentY + chartHeight > 280) {
                doc.addPage();
                currentY = 20;
                doc.text('3. CII Prediction (10 Years)', 14, currentY);
                currentY += 10;
            }

            // Safely draw chart
            this.drawCiiChart(doc, chartX, currentY, chartWidth, chartHeight, calculation);

            // Footer
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text('Powered by Co-Fleeter', 14, 285);

            const filename = `CII_Report_${inputs.vesselName || 'Ship'}_${Date.now()}.pdf`;
            doc.save(filename);

            if (typeof toast !== 'undefined') toast.success('PDF exported successfully!');
        } catch (error) {
            console.error('PDF export error:', error);
            if (typeof toast !== 'undefined') toast.error('Failed to export PDF: ' + error.message);
        }
    }

    /**
     * Draw 10-Year CII Prediction Chart directly on PDF
     * HARDENED against NaN values to prevent crash.
     */
    drawCiiChart(doc, x, y, w, h, data) {
        if (!data.inputs || !data.result) return;

        const startYear = parseInt(data.inputs.year) || new Date().getFullYear();
        const attained = parseFloat(data.result.attainedCII);

        // Safe DWT parsing: handle strings with commas
        const rawDwt = (data.inputs.dwt || '0').toString().replace(/,/g, '');
        let dwt = parseFloat(rawDwt);
        if (isNaN(dwt)) dwt = 0;

        if (typeof calculatorService === 'undefined') {
            doc.text("[Chart Data Unavailable]", x + w / 2, y + h / 2, { align: 'center' });
            return;
        }

        const limits = calculatorService._getCIILimits(data.inputs.shipType, dwt);
        // Ensure boundaries are valid numbers; fallback defaults if logic fails
        const boundaries = (limits && limits.d && limits.d.length === 4) ? limits.d : [0.83, 0.94, 1.06, 1.19];

        // Safe Required CII Wrapper
        const getRequired = (yr) => {
            const z = calculatorService.getReductionFactor(yr);
            const currentRed = calculatorService.getReductionFactor(startYear);
            let currentReq = parseFloat(data.result.requiredCII);
            if (isNaN(currentReq)) currentReq = 0;

            const baseRef = currentReq / ((100 - currentRed) / 100);
            if (!isFinite(baseRef)) return 0;

            return baseRef * ((100 - z) / 100);
        };

        const years = [];
        for (let i = 0; i <= 10; i++) years.push(startYear + i);

        // Check Max Value for Scaling
        const maxReq = getRequired(startYear);
        let maxVal = Math.max(attained, maxReq * boundaries[3] * 1.2);
        if (isNaN(maxVal) || maxVal === 0) maxVal = 10; // Default scale to avoid infinite Y coords

        const getX = (yr) => x + ((yr - startYear) / 10) * w;
        const getY = (val) => y + h - ((val / maxVal) * h);

        const isValid = (n) => typeof n === 'number' && !isNaN(n) && isFinite(n);

        // Draw Bands
        for (let i = 0; i < years.length - 1; i++) {
            const yr1 = years[i];
            const yr2 = years[i + 1];

            const req1 = getRequired(yr1);
            const req2 = getRequired(yr2);

            const getLimitsY = (r) => [0, r * boundaries[0], r * boundaries[1], r * boundaries[2], r * boundaries[3], maxVal];
            const l1 = getLimitsY(req1);
            const l2 = getLimitsY(req2);

            const colors = [[100, 200, 100], [200, 230, 200], [255, 255, 200], [255, 200, 150], [255, 150, 150]];

            const x1 = getX(yr1);
            const x2 = getX(yr2);

            for (let b = 0; b < 5; b++) {
                doc.setFillColor(...colors[b]);
                const yBot1 = getY(l1[b]);
                const yTop1 = getY(l1[b + 1]);
                const yBot2 = getY(l2[b]);
                const yTop2 = getY(l2[b + 1]);

                // Only draw if ALL coordinates are valid numbers
                if (isValid(x1) && isValid(yBot1) && isValid(x2) && isValid(yBot2) && isValid(yTop1) && isValid(yTop2)) {
                    doc.triangle(x1, yBot1, x1, yTop1, x2, yTop2, 'F');
                    doc.triangle(x1, yBot1, x2, yTop2, x2, yBot2, 'F');
                }
            }
        }

        // Attained Line
        if (isValid(attained)) {
            doc.setDrawColor(0, 0, 100);
            doc.setLineWidth(0.8);
            const yAtt = getY(attained);
            if (isValid(yAtt)) {
                doc.line(x, yAtt, x + w, yAtt);
                // Label
                doc.setFontSize(9);
                doc.setTextColor(0);
                doc.text(`Attained: ${attained.toFixed(2)}`, x + w + 2, yAtt);
            }
        }

        // Dots/Labels
        doc.setFontSize(8);
        doc.setTextColor(0);
        years.forEach((yr) => {
            const px = getX(yr);
            if (!isValid(px)) return;

            doc.setDrawColor(0);
            doc.setLineWidth(0.1);
            doc.line(px, y + h, px, y + h + 2);
            doc.text(String(yr), px, y + h + 6, { align: 'center' });

            if (isValid(attained)) {
                const yAtt = getY(attained);
                if (isValid(yAtt)) {
                    doc.setFillColor(0, 0, 50);
                    doc.circle(px, yAtt, 1, 'F');
                }
            }
        });

        doc.setDrawColor(0);
        doc.rect(x, y, w, h);
    }

    /**
     * Export Calculation to Excel (Matches PDF Layout)
     */
    exportToExcel(calculation) {
        if (!this.checkLibraries()) return;

        try {
            const inputs = calculation.inputs || {};
            const result = calculation.result || {};

            // Initialize Grid
            const ws = XLSX.utils.aoa_to_sheet([['Co-Fleeter Calculation Report']]); // A1 (Header)

            // --- 1. Basic Data ---
            XLSX.utils.sheet_add_aoa(ws, [['1. Basic Data']], { origin: 'A3' });

            // Left Table (A4:B8)
            const leftData = [
                ['Ship\'s Name', inputs.vesselName || '-'],
                ['IMO NO', inputs.imoNumber || '-'],
                ['SHIP\'S TYPE', inputs.shipType || '-'],
                ['DWT or GT', inputs.dwt || '-'],
                ['항해거리', inputs.distance || '-']
            ];
            XLSX.utils.sheet_add_aoa(ws, leftData, { origin: 'A4' });

            // Right Table (D4:E7)
            const rightData = [
                ['Calculation Year', inputs.year || '-'],
                ['Required CII', result.requiredCII || '-'],
                ['Attained CII', result.attainedCII || '-'],
                ['Grade', result.rating || '-']
            ];
            XLSX.utils.sheet_add_aoa(ws, rightData, { origin: 'D4' });

            // --- 2. Fuel Consumption ---
            XLSX.utils.sheet_add_aoa(ws, [['2. Fuel Consumption']], { origin: 'A10' });

            // Header Row (A11)
            const fuelHeader = [['Fuel', 'Fuel Cons. [ton]', 'Remark']];
            XLSX.utils.sheet_add_aoa(ws, fuelHeader, { origin: 'A11' });

            // Fuel Data Rows (A12+)
            const fuelRows = (calculation.fuels || []).map(f => [
                f.type || '-',
                f.amount || 0,
                ''
            ]);
            // Fill empty rows to match look (Image has ~8 rows)
            while (fuelRows.length < 8) fuelRows.push(['N/A', '-', '']);

            XLSX.utils.sheet_add_aoa(ws, fuelRows, { origin: 'A12' });

            // Styling / Widths
            ws['!cols'] = [
                { wch: 25 }, // A
                { wch: 35 }, // B
                { wch: 30 }, // C (Remark / Gap)
                { wch: 20 }, // D (Right Table Label)
                { wch: 15 }  // E (Right Table Value)
            ];

            // Create Workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'CII Report');

            // Save
            const filename = `CII_Report_${inputs.vesselName || 'Ship'}_${Date.now()}.xlsx`;
            XLSX.writeFile(wb, filename);

            if (typeof toast !== 'undefined') toast.success('Excel file exported successfully!');
        } catch (error) {
            console.error('Excel export error:', error);
            if (typeof toast !== 'undefined') toast.error('Failed to export Excel: ' + error.message);
        }
    }

    /**
     * Export fleet data to Excel
     * @param {Array} fleet - Fleet data
     */
    exportFleetToExcel(fleet) {
        if (!this.checkLibraries()) return;

        try {
            const data = [];

            // Header
            data.push(['Co-Fleeter Fleet Report']);
            data.push([]);
            data.push(['Generated:', new Date().toLocaleString()]);
            data.push(['Total Vessels:', fleet.length]);
            data.push([]);

            // Column headers
            data.push(['Vessel Name', 'IMO Number', 'Type', 'DWT', 'Year', 'CII Rating', 'YTD CO2 (mT)']);

            // Fleet data
            fleet.forEach(ship => {
                data.push([
                    ship.name,
                    ship.id,
                    ship.type,
                    ship.dwt,
                    ship.year,
                    ship.cii_rating || 'N/A',
                    ship.co2_ytd || 0
                ]);
            });

            // Create workbook
            const ws = XLSX.utils.aoa_to_sheet(data);
            ws['!cols'] = [
                { wch: 20 },
                { wch: 15 },
                { wch: 15 },
                { wch: 10 },
                { wch: 8 },
                { wch: 12 },
                { wch: 15 }
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Fleet');

            // Save
            const filename = `cofleeter_fleet_${Date.now()}.xlsx`;
            XLSX.writeFile(wb, filename);

            if (typeof toast !== 'undefined') toast.success('Fleet data exported successfully!');
        } catch (error) {
            console.error('Fleet export error:', error);
            if (typeof toast !== 'undefined') toast.error('Failed to export fleet data: ' + error.message);
        }
    }

    /**
     * Format label for display
     */
    formatLabel(key) {
        return key
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
    }
}

// Create global instance
const exportManager = new ExportManager();
