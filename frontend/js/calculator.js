/**
 * Co-Fleeter Regulation Calculator Engine
 * Refactored for Multi-source / Multi-fuel support
 * Enhanced with IMO CII Reference Lines & Ship Types
 */

// Co-Fleeter Regulation Calculator Engine
// Enhanced for External Configuration (Server/Google Sheet)

class CalculatorService {

    constructor() {
        this.constants = {
            CII_REF: {},
            CII_REDUCTION: {},
            FUEL_DATA: {} // { "Fossil": [{name, cf}], ... }
        };
        // Fallback/Legacy Constants (minimally required to prevent crash before init)
        this.legacyFactors = {
            'HFO': 3.114, 'LFO': 3.151, 'MGO': 3.206, 'LNG': 2.750, 'Methanol': 1.375
        };

        this.DEFAULT_FUEL_DATA = {
            "Fossil": [
                { name: "HFO", lcv: 0.0405, intensity: 91.14 },
                { name: "LFO", lcv: 0.0410, intensity: 90.82 },
                { name: "MGO", lcv: 0.0427, intensity: 89.60 },
                { name: "LNG", lcv: 0.0480, intensity: 78.00 },
                { name: "Methanol", lcv: 0.0199, intensity: 97.00 },
                { name: "LPG (Butane)", lcv: 0.0457, intensity: 66.70 },
                { name: "LPG (Propane)", lcv: 0.0463, intensity: 63.00 },
                { name: "LSFO (crude)", lcv: 0.0405, intensity: 92.06 },
                { name: "LSFO (blend)", lcv: 0.0405, intensity: 92.86 },
                { name: "ULSFO", lcv: 0.0405, intensity: 91.44 }
            ],
            "Biofuels": [
                { name: "Bio-diesel", lcv: 0.0370, intensity: 15.00 },
                { name: "Bio-methanol", lcv: 0.0199, intensity: 5.00 },
                { name: "Bio-LNG", lcv: 0.0480, intensity: 10.00 }
            ]
        };
    }

    async init() {
        try {
            const res = await fetch('/api/data/cii-configurations');
            const data = await res.json();

            if (data.constants) {
                this.constants.CII_REF = data.constants.CII_REF;
                this.constants.CII_REDUCTION = data.constants.CII_REDUCTION;
            }
            if (data.fuels) {
                this.constants.FUEL_DATA = data.fuels;
            }
            if (data.euData) {
                this.constants.EU_DATA = data.euData;
            }
            console.log("Calculator initialized with server configurations.");
        } catch (e) {
            console.error("Failed to initialize calculator config", e);
        }
    }

    /**
     * Helper to get available fuel list for a class
     */
    getAvailableFuels(fuelClass) {
        let fuels = [];
        // 1. Try Dynamic Data
        if (this.constants.FUEL_DATA && this.constants.FUEL_DATA[fuelClass]) {
            fuels = this.constants.FUEL_DATA[fuelClass].map(f => f.name);
        }

        // 2. Fallback to Default Data if empty or class not found
        if (fuels.length === 0 && this.DEFAULT_FUEL_DATA && this.DEFAULT_FUEL_DATA[fuelClass]) {
            fuels = this.DEFAULT_FUEL_DATA[fuelClass].map(f => f.name);
        }

        return fuels;
    }

    /**
     * Helper to lookup Fuel details (Intensity, LCV, C Slip, WtT)
     */
    _getFuelDetails(fuelType, fuelClass = null) {
        // 1. Try Dynamic EU Data (Priority for LCV/Intensity)
        if (this.constants.EU_DATA) {
            // Search across all categories in EU_DATA
            for (const cat in this.constants.EU_DATA) {
                const fuels = this.constants.EU_DATA[cat];
                const match = fuels.find(f => f.name === fuelType);
                if (match) {
                    return {
                        intensity: match['WtW'] || match['WtW (CO2eq)'] || 0,
                        lcv: match['LCV'] || 0,
                        cSlip: match['C slip'] || 0,
                        wtt: match['WtT (CO2eq)'] || 0,
                        cf_ch4: match['cf_ch4'],
                        cf_n2o: match['cf_n2o']
                    };
                }
            }
        }

        // 2. Try Standard FUEL_DATA (Legacy fallback)
        if (this.constants.FUEL_DATA) {
            for (const cls in this.constants.FUEL_DATA) {
                if (fuelClass && cls !== fuelClass) continue;
                const fuels = this.constants.FUEL_DATA[cls];
                const match = fuels.find(f => f.name === fuelType);
                if (match) {
                    return {
                        intensity: match['WTW'] || match['WtW'] || match['wtw'] || 0,
                        lcv: match['LCV'] || match['lcv'] || 0,
                        cSlip: match['C slip'] || 0,
                        wtt: match['WtT'] || 0
                    };
                }
            }
        }

        // 2. Try Default Data
        if (this.DEFAULT_FUEL_DATA) {
            for (const cls in this.DEFAULT_FUEL_DATA) {
                if (fuelClass && cls !== fuelClass) continue;
                const fuels = this.DEFAULT_FUEL_DATA[cls];
                const match = fuels.find(f => f.name === fuelType);
                if (match) {
                    return {
                        intensity: match.intensity,
                        lcv: match.lcv,
                        cSlip: 0,
                        wtt: 0 // Simplification for legacy
                    };
                }
            }
        }

        return { intensity: 0, lcv: 0, cSlip: 0, wtt: 0 };
    }

    /**
     * Helper to lookup CO2 Factor
     * Checks dynamic fuel data first, falls back to legacy
     */
    _getCO2Factor(fuelType, fuelClass = null) {
        // Try to find in FUEL_DATA
        if (this.constants.FUEL_DATA) {
            for (const cls in this.constants.FUEL_DATA) {
                // If class specified, only check that class
                if (fuelClass && cls !== fuelClass) continue;

                const fuels = this.constants.FUEL_DATA[cls];
                const match = fuels.find(f => f.name === fuelType);
                // Cf CO2 is the standard factor
                if (match) return match['Cf CO2'] || match.cf || 0;
            }
        }
        // Fallback
        return this.legacyFactors[fuelType] || 0;
    }

    /**
     * Helper to calculate Total CO2
     * @param {Array} fuelList [{ type, amount, scope, class }]
     * @param {Boolean} useScope 
     * @param {Boolean} applySlip If true, applies LNG Slip logic & CH4/N2O (ETS Mode)
     */
    _calculateTotalCO2(fuelList, useScope = false, applySlip = false) {
        const GWP_CH4 = 25; // Global Warming Potential for Methane
        const GWP_N2O = 298; // Global Warming Potential for Nitrous Oxide

        return fuelList.reduce((sum, item) => {
            const factorCO2 = parseFloat(this._getCO2Factor(item.type, item.class));
            const details = this._getFuelDetails(item.type, item.class);

            // Default factors if not yet in details
            let factorCH4 = details.cf_ch4 !== undefined ? details.cf_ch4 : 0.00005;
            let factorN2O = details.cf_n2o !== undefined ? details.cf_n2o : 0.00018;

            // Adjust defaults logic solely for calculation safety type checks
            const lowerType = (item.type || '').toLowerCase();
            if (lowerType.includes('lng')) {
                if (details.cf_ch4 === undefined) factorCH4 = 0;
                if (details.cf_n2o === undefined) factorN2O = 0.00011;
            } else if (lowerType.includes('methanol')) {
                if (details.cf_ch4 === undefined) factorCH4 = 0;
                if (details.cf_n2o === undefined) factorN2O = 0;
            }

            // Determine Amount
            let amount = 0;
            if (item.nonEu !== undefined) {
                const scopeNonEu = useScope ? 0.5 : 1.0;
                const scopeEu = useScope ? 1.0 : 1.0;
                amount = (item.nonEu * scopeNonEu) + (item.eu * scopeEu);
            } else {
                const scopeMultiplier = useScope ? (item.scope || 1.0) : 1.0;
                amount = item.amount * scopeMultiplier;
            }

            let co2ForFuel = 0;
            let ch4ForFuel = 0;
            let n2oForFuel = 0;

            // Apply ETS / GWP Logic
            if (applySlip) {
                // If LNG Slip is present
                if (details.cSlip > 0) {
                    const cSlipPercent = parseFloat(details.cSlip || 0);
                    // 1. Methane Slip Mass
                    const slipMass = amount * (cSlipPercent / 100);
                    // 2. Combusted Mass
                    const combustedMass = amount - slipMass;

                    // 3. CO2 from Combustion
                    co2ForFuel = combustedMass * factorCO2;

                    // 4. CH4 Slope (GWP)
                    ch4ForFuel = slipMass * GWP_CH4;

                    // 5. N2O from Combustion
                    n2oForFuel = combustedMass * factorN2O * GWP_N2O;

                } else {
                    // Standard Fuels (HFO/LFO/MGO)
                    co2ForFuel = amount * factorCO2;
                    ch4ForFuel = amount * factorCH4 * GWP_CH4;
                    n2oForFuel = amount * factorN2O * GWP_N2O;
                }
            } else {
                // Legacy / CII (CO2 only)
                co2ForFuel = amount * factorCO2;
            }

            return {
                total: sum.total + co2ForFuel + ch4ForFuel + n2oForFuel,
                co2: sum.co2 + co2ForFuel,
                ch4: sum.ch4 + ch4ForFuel,
                n2o: sum.n2o + n2oForFuel
            };
        }, { total: 0, co2: 0, ch4: 0, n2o: 0 });
    }

    /**
     * Get Reduction Factor
     */
    getReductionFactor(year) {
        const y = year.toString();
        // Check dynamic constants
        if (this.constants.CII_REDUCTION && this.constants.CII_REDUCTION[y]) {
            return this.constants.CII_REDUCTION[y];
        }

        const yInt = parseInt(year);
        // Fallback Logic (same as before if not in map)
        if (yInt <= 2019) return 0;
        if (yInt >= 2020 && yInt <= 2022) return 0;

        // Extrapolation
        if (yInt > 2026) {
            const base2026 = this.constants.CII_REDUCTION['2026'] || 11;
            const diff = yInt - 2026;
            return base2026 + (diff * 2);
        }
        return 0;
    }

    /**
     * Calculate CII
     */
    calculateCII(dwt, distance, fuelList, shipType, year = '2024') {
        const emissionCalcs = this._calculateTotalCO2(fuelList, false);
        const totalCO2 = emissionCalcs.total; // For CII, total is CO2 if applySlip is false (legacy behavior preserved)

        if (dwt <= 0 || distance <= 0) return { rating: 'N/A', score: 0 };

        // 1. Attained CII (grams CO2 / dwt-nm)
        const attainedCII = (totalCO2 * 1000000) / (dwt * distance);

        // 2. Required CII
        // Use Dynamic Server Data if available
        let ref = null;
        if (this.constants.CII_REF && this.constants.CII_REF[shipType]) {
            ref = this.constants.CII_REF[shipType];
        } else {
            // Lookup Reference based on Ship Type and Size
            ref = this._getCIILimits(shipType, dwt);
        }

        const reduction = this.getReductionFactor(year);

        // Capacity Correction Logic (Ceiling/Floor application per IMO G2 Guidelines)
        let calculationCapacity = dwt;
        const typeLower = shipType.toLowerCase();

        // 1. Bulk Carrier >= 279,000 DWT: Cap at 279,000
        if (typeLower.includes('bulk carrier') && dwt >= 279000) {
            calculationCapacity = 279000;
        }
        // 2. LNG Carrier < 65,000 DWT: Floor at 65,000 (Note: User request says "reflect 65,000")
        // IMO Guidelines usually say for < 65k, use specific a/c. But if user wants to use same formula but with fixed capacity:
        else if (typeLower.includes('lng carrier') && dwt < 65000) {
            calculationCapacity = 65000;
        }
        // 3. Ro-ro cargo (vehicle carrier) >= 57,700 GT: Cap/Fix at 57,700
        // Note: Input is 'dwt'. Assuming user enters GT in the DWT field for Ro-Ro as permitted by app logic.
        else if (typeLower.includes('vehicle') && dwt >= 57700) {
            calculationCapacity = 57700;
        }

        // Reference CII = a * Capacity^(-c)
        const referenceCII = ref.a * Math.pow(calculationCapacity, -ref.c);

        // Required CII = (100 - Z) / 100 * Reference
        const requiredCII = ((100 - reduction) / 100) * referenceCII;

        // 3. Rating Logic
        const ratio = attainedCII / requiredCII;
        const d = ref.d; // [d1, d2, d3, d4] boundaries

        let rating = 'E';
        if (ratio < d[0]) rating = 'A';
        else if (ratio < d[1]) rating = 'B';
        else if (ratio < d[2]) rating = 'C';
        else if (ratio < d[3]) rating = 'D';

        return {
            type: 'CII',
            input: { dwt, distance, fuelList, shipType, year, reductionRate: reduction },
            result: {
                attainedCII: attainedCII.toFixed(2),
                requiredCII: requiredCII.toFixed(2),
                reductionRate: reduction + '%',
                ratio: ratio.toFixed(2),
                rating: rating,
                totalCO2: totalCO2.toFixed(1)
            },
            timestamp: Date.now()
        };
    }

    /**
     * Helper to get CII Params (a, c, boundaries) based on Type & Size
     * Source: User provided table (MEPC)
     */
    _getCIILimits(type, size) {
        // Normalize type
        const t = type.toLowerCase();

        // Defaults (Fallbacks if no match)
        let ref = { a: 4745, c: 0.622, d: [0.86, 0.94, 1.06, 1.18] }; // Bulk Carrier default

        // Logic Table
        if (t.includes('bulk carrier')) {
            // >= 279,000 and < 279,000 have SAME values in table
            ref = { a: 4745, c: 0.622, d: [0.86, 0.94, 1.06, 1.18] };
        }
        else if (t.includes('gas carrier') && !t.includes('lng')) {
            if (size >= 65000) {
                ref = { a: 1.44e11, c: 2.071, d: [0.81, 0.91, 1.12, 1.44] };
            } else {
                ref = { a: 8104, c: 0.639, d: [0.85, 0.95, 1.06, 1.25] };
            }
        }
        else if (t.includes('tanker')) {
            ref = { a: 5247, c: 0.610, d: [0.82, 0.93, 1.08, 1.28] };
        }
        else if (t.includes('container')) {
            ref = { a: 1984, c: 0.489, d: [0.83, 0.94, 1.07, 1.19] };
        }
        else if (t.includes('general cargo')) {
            if (size >= 20000) {
                ref = { a: 31948, c: 0.792, d: [0.83, 0.94, 1.06, 1.19] };
            } else {
                ref = { a: 588, c: 0.3885, d: [0.83, 0.94, 1.06, 1.19] };
            }
        }
        else if (t.includes('refrigerated')) {
            ref = { a: 4600, c: 0.557, d: [0.78, 0.91, 1.07, 1.20] };
        }
        else if (t.includes('combination')) {
            ref = { a: 5119, c: 0.622, d: [0.87, 0.96, 1.06, 1.14] };
        }
        else if (t.includes('lng carrier')) {
            if (size >= 100000) {
                ref = { a: 9.827, c: 0.000, d: [0.89, 0.98, 1.06, 1.13] };
            } else if (size >= 65000) {
                ref = { a: 1.45e14, c: 2.673, d: [0.78, 0.92, 1.10, 1.37] };
            } else {
                ref = { a: 1.48e14, c: 2.673, d: [0.78, 0.92, 1.10, 1.37] };
            }
        }
        else if (t.includes('vehicle') || (t.indexOf('ro-ro cargo') !== -1 && t.indexOf('< 30,000') !== -1) || (t.includes('ro-ro cargo') && size >= 30000)) {
            // Logic for Vehicle Carriers OR Small Ro-Ro (<30k) which share usage of "Vehicle" logic usually?
            // Re-reading table: Ro-ro cargo (<30k GT) is 330, 0.329.
            // Vehicle Carrier (all sizes) shares 3627, 0.59 EXCEPT < 30k Vehicle which is 330, 0.329?
            // If string contains "< 30,000":
            if (t.includes('< 30,000') || size < 30000) {
                ref = { a: 330, c: 0.329, d: [0.86, 0.94, 1.06, 1.16] };
            } else {
                ref = { a: 3627, c: 0.59, d: [0.86, 0.94, 1.06, 1.16] };
            }
        }
        else if (t.includes('ro-ro cargo') && !t.includes('vehicle')) {
            // Generic Ro-Ro
            ref = { a: 1967, c: 0.485, d: [0.86, 0.94, 1.06, 1.16] };
        }
        else if (t.includes('ro-ro passenger')) {
            if (t.includes('high speed')) {
                ref = { a: 4196, c: 0.460, d: [0.76, 0.92, 1.14, 1.30] };
            } else {
                ref = { a: 2023, c: 0.460, d: [0.76, 0.89, 1.08, 1.27] };
            }
        }
        else if (t.includes('cruise')) {
            ref = { a: 930, c: 0.383, d: [0.87, 0.95, 1.06, 1.16] };
        }

        return ref;
    }

    calculateETS(fuelList, year, euaPrice) {
        // ETS uses Scope (50% for Voyage, 100% for Port)
        // Also apply LNG Slip Logic for EU Regulations
        const emissions = this._calculateTotalCO2(fuelList, true, true);
        const totalScopedCO2 = emissions.total;

        const phaseInMap = {
            '2024': 0.40, '2025': 0.70, '2026': 1.00, '2030': 1.00
        };
        const phaseIn = phaseInMap[year] || 1.0;

        const payableCO2 = totalScopedCO2 * phaseIn;
        const estimatedCost = payableCO2 * euaPrice;

        return {
            type: 'EU-ETS',
            input: { fuelList, year, euaPrice },
            result: {
                totalCO2: totalScopedCO2.toFixed(1), // Display Scoped Total
                payableCO2: payableCO2.toFixed(1),
                phaseIn: (phaseIn * 100) + '%',
                estimatedCost: estimatedCost.toFixed(2),

                // Detailed Emissions for Reference
                'CO2 (CO2e)': emissions.co2.toFixed(1) + ' mT',
                'CH4 (CO2e)': emissions.ch4.toFixed(1) + ' mT',
                'N2O (CO2e)': emissions.n2o.toFixed(1) + ' mT'
            },
            timestamp: Date.now()
        };
    }

    calculateFuelEU(fuelList, year) {
        return this.calculateEU(fuelList, year, 0);
    }

    calculateEU(fuelList, year, euaPrice) {
        // --- Part 1: ETS Calculation ---
        const emissions = this._calculateTotalCO2(fuelList, true, true);
        const totalScopedCO2 = emissions.total;

        const phaseInMap = {
            '2024': 0.40, '2025': 0.70, '2026': 1.00, '2030': 1.00
        };
        const phaseIn = phaseInMap[year] || 1.0;
        const payableCO2 = totalScopedCO2 * phaseIn;
        const estimatedCost = payableCO2 * euaPrice;


        // --- Part 2: FuelEU Calculation (Priority Allocation Logic) ---
        // Ensure result is 82.68 for user scenario.
        // Method: Global Priority Allocation using direct WtW constants.

        let acceptedEnergyDemand = 0;
        let availableFuelPool = [];

        // 1. Build Demand and Available Pool
        fuelList.forEach(item => {
            // Get Constants
            const defaults = this._getFuelDetails(item.type, item.class);
            const lcv = (item.customLCV !== null && item.customLCV !== undefined) ? item.customLCV : defaults.lcv;

            // WtW Intensity: Use Direct Value from Data (or custom input)
            // This is critical to matching the user's manual Calc which used the WtW column.
            const wtwIntensity = (item.customIntensity !== null && item.customIntensity !== undefined) ? item.customIntensity : defaults.intensity;

            // Physical Energy (MJ)
            // FIX: Use NON-EU + EU if available to get total physical mass.
            let physicalMass = item.amount;
            if (item.nonEu !== undefined && item.eu !== undefined) {
                physicalMass = item.nonEu + item.eu;
            }
            const physicalEnergy = physicalMass * 1000000 * parseFloat(lcv);

            // Scoped Demand (MJ)
            let scopedAmt = 0;
            if (item.nonEu !== undefined) {
                // Split voyage: 50% nonEu, 100% eu
                scopedAmt = (item.nonEu * 0.5) + (item.eu * 1.0);
            } else {
                // Standard scope
                scopedAmt = item.amount * (item.scope || 1.0);
            }
            const demandEnergy = scopedAmt * 1000000 * parseFloat(lcv);
            acceptedEnergyDemand += demandEnergy;

            availableFuelPool.push({
                energy: physicalEnergy,
                intensity: parseFloat(wtwIntensity || 0),
                name: item.type
            });
        });

        // 2. Sort Pool (Lowest Intensity First -> Green Fuel First)
        availableFuelPool.sort((a, b) => a.intensity - b.intensity);

        // 3. Allocate to Demand
        let remainingDemand = acceptedEnergyDemand;
        let totalWeightedGHG = 0;

        for (const fuel of availableFuelPool) {
            if (remainingDemand <= 0) break;

            const take = Math.min(remainingDemand, fuel.energy);
            const ghg = take * fuel.intensity;
            totalWeightedGHG += ghg;

            remainingDemand -= take;
        }

        // 4. Actual Intensity
        const actualIntensity = acceptedEnergyDemand > 0 ? (totalWeightedGHG / acceptedEnergyDemand) : 0;


        // FuelEU Targets (gCO2eq/MJ)
        const targetMap = {
            '2025': 89.34, // 2% reduction
            '2030': 85.69, // 6% reduction
            '2035': 77.94, // 14.5% reduction (91.16 * 0.855)
            '2040': 62.90, // 31% reduction (91.16 * 0.69)
            '2045': 34.64, // 62% reduction (91.16 * 0.38)
            '2050': 18.23  // 80% reduction (91.16 * 0.20)
        };

        let target = 91.16; // Baseline
        if (targetMap[year]) {
            target = targetMap[year];
        } else {
            // Logic to fallback to closest previous bracket for years like 2026-2029 if passed manually
            const yInt = parseInt(year);
            if (yInt >= 2050) target = targetMap['2050'];
            else if (yInt >= 2045) target = targetMap['2045'];
            else if (yInt >= 2040) target = targetMap['2040'];
            else if (yInt >= 2035) target = targetMap['2035'];
            else if (yInt >= 2030) target = targetMap['2030'];
            else if (yInt >= 2025) target = targetMap['2025'];
        }

        const diff = target - actualIntensity;
        // Balance = (Target - Actual) * Energy
        const balance = diff * acceptedEnergyDemand;

        return {
            type: 'EU Included',
            id: 'EU_CALC', // Special ID for unified view
            input: { fuelList, year, euaPrice },
            result: {
                // ETS Results
                'Total CO2 (Scoped)': totalScopedCO2.toFixed(1) + ' mT',
                'ETS Payable': payableCO2.toFixed(1) + ' mT',
                'ETS Phase-In': (phaseIn * 100).toFixed(0) + '%',
                'Est. ETS Cost': '€ ' + estimatedCost.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }),

                // FuelEU Results
                'FuelEU Target': target.toFixed(2),
                'Actual Intensity': actualIntensity.toFixed(2),
                'Compliance Bal.': (balance / 1000000).toFixed(1) + ' mT CO2eq', // Convert g to mT for readable balance
                'FuelEU Status': balance >= 0 ? 'Surplus (OK)' : 'Deficit (Penalty)',

                // Detailed Breakdown
                'CO2 Only': emissions.co2.toFixed(1) + ' mT',
                'CH4 (CO2e)': emissions.ch4.toFixed(1) + ' mT',
                'N2O (CO2e)': emissions.n2o.toFixed(1) + ' mT'
            },
            timestamp: Date.now()
        };
    }
}

const calculatorService = new CalculatorService();
