    // Actual paid/gallons form logic
    const actualSection = document.getElementById('gas-actual-section');
    const actualForm = document.getElementById('gas-actual-form');
    const actualResultsContent = document.getElementById('actual-results-content');

    // Show actual section after main calculation
    function showActualSection() {
        actualSection.style.display = 'block';
    }

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('gas-form');
    const resultsSection = document.getElementById('results');
    const resultsContent = document.getElementById('results-content');

    // Local storage key
    const STORAGE_KEY = 'gasCalculatorInputs';

    // Restore values from localStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (typeof data === 'object' && data) {
                if (data.pricePump !== undefined) document.getElementById('pricePump').value = data.pricePump;
                if (data.stationRewards !== undefined) document.getElementById('stationRewards').value = data.stationRewards;
                if (data.uberCashback !== undefined) document.getElementById('uberCashback').value = data.uberCashback;
                if (data.upsideCashback !== undefined) document.getElementById('upsideCashback').value = data.upsideCashback;
                if (data.targetTotal !== undefined) document.getElementById('targetTotal').value = data.targetTotal;
            }
        } catch (e) {}
    }

    // Save values to localStorage on input
    form.addEventListener('input', function() {
        const data = {
            pricePump: document.getElementById('pricePump').value,
            stationRewards: document.getElementById('stationRewards').value,
            uberCashback: document.getElementById('uberCashback').value,
            upsideCashback: document.getElementById('upsideCashback').value,
            targetTotal: document.getElementById('targetTotal').value
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    });

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        // Get input values
        const pricePump = parseFloat(document.getElementById('pricePump').value) || 0;
        const stationRewards = parseFloat(document.getElementById('stationRewards').value) || 0;
        const uberCashbackPercent = parseFloat(document.getElementById('uberCashback').value) || 0;
        const upsideCashback = parseFloat(document.getElementById('upsideCashback').value) || 0;
        const targetTotal = parseFloat(document.getElementById('targetTotal').value) || 0;

        // User formulas:
        // gallons = target payment / ((price at pump - station rewards) * (1 - uber cashback) - upside cashback)
        // money to spend = (price at pump - station rewards) * gallons
        // upside rewards = upside cashback * gallons
        // uber rewards = (price at pump - station rewards) * uber cashback * gallons

        const priceMinusRewards = pricePump - stationRewards;
        const uberFraction = uberCashbackPercent / 100;
        const denom = (priceMinusRewards * (1 - uberFraction)) - upsideCashback;
        if (denom <= 0) {
            resultsContent.innerHTML = '<span style="color:red;">Calculation error: denominator is zero or negative. Please check your inputs.</span>';
            resultsSection.style.display = 'block';
            document.getElementById('gas-summary').style.display = 'none';
            return;
        }
        const gallons = targetTotal / denom;
        const amountAtPump = priceMinusRewards * gallons;
        const upsideCashbackActual = upsideCashback * gallons;
        const uberCashbackActual = priceMinusRewards * uberFraction * gallons;
        const stationRewardsTotal = gallons * stationRewards;
        // New formula: (price at pump - station rewards - upside cashback) * (1 - uber cashback)
        const finalPerGallon = (pricePump - stationRewards - upsideCashback) * (1 - uberFraction);

        // Show summary grid styled like groceries
        const summaryGrid = document.getElementById('gas-summary-grid');
        summaryGrid.innerHTML = '';
        summaryGrid.appendChild(createSummaryStat('Gallons', gallons.toFixed(3), false));
        summaryGrid.appendChild(createSummaryStat('Total at Pump', amountAtPump.toFixed(2), true));
        summaryGrid.appendChild(createSummaryStat('Uber Cashback', uberCashbackActual.toFixed(2), false));
        summaryGrid.appendChild(createSummaryStat('Upside Cashback', upsideCashbackActual.toFixed(2), false));
        summaryGrid.appendChild(createSummaryStat('Final Per-Gallon', finalPerGallon.toFixed(3), false));
        document.getElementById('gas-summary-card').style.display = 'block';
        document.getElementById('results-card').style.display = 'block';
        document.getElementById('actuals-card').style.display = 'block';
    // Handle actual paid/gallons calculation
    if (actualForm) {
        actualForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const actualPaid = parseFloat(document.getElementById('actualPaid').value) || 0;
            const actualGallons = parseFloat(document.getElementById('actualGallons').value) || 0;
            // Use the current form values for cashback calculations
            const uberCashbackPercent = parseFloat(document.getElementById('uberCashback').value) || 0;
            const upsideCashback = parseFloat(document.getElementById('upsideCashback').value) || 0;
            if (actualPaid <= 0 || actualGallons <= 0) {
                actualResultsContent.innerHTML = '<span style="color:red;">Please enter valid values for both fields.</span>';
                return;
            }
            // Uber cashback earned: amount paid at pump * uber cashback
            const uberCashbackActual = actualPaid * (uberCashbackPercent / 100);
            // Upside cashback earned: gallons put in car * upside cashback
            const upsideCashbackActual = actualGallons * upsideCashback;
            const finalPerGallon = (actualPaid - uberCashbackActual - upsideCashbackActual) / actualGallons;
            // Render as summary grid styled like groceries, in its own card
            const actualGrid = document.createElement('div');
            actualGrid.className = 'summary-grid';
            actualGrid.appendChild(createSummaryStat('Final Per-Gallon', finalPerGallon.toFixed(3), true));
            actualGrid.appendChild(createSummaryStat('Uber Cashback', uberCashbackActual.toFixed(2), false));
            actualGrid.appendChild(createSummaryStat('Upside Cashback', upsideCashbackActual.toFixed(2), false));
            actualResultsContent.innerHTML = '';
            actualResultsContent.appendChild(actualGrid);
            document.getElementById('actuals-results-card').style.display = 'block';
        });
    }

        // Results breakdown
        resultsContent.innerHTML = `
            <ul>
                <li><strong>Gallons you can get:</strong> ${gallons.toFixed(3)}</li>
                <li><strong>Amount to pay at pump:</strong> $${amountAtPump.toFixed(2)}</li>
                <li><strong>Uber cashback earned:</strong> $${uberCashbackActual.toFixed(2)}</li>
                <li><strong>Upside cashback earned:</strong> $${upsideCashbackActual.toFixed(2)}</li>
                <li><strong>Station rewards earned:</strong> $${stationRewardsTotal.toFixed(2)}</li>
                <li><strong>Final effective per-gallon price:</strong> $${finalPerGallon.toFixed(3)}</li>
            </ul>
            <h3>Calculation Breakdown</h3>
            <pre>
Net per-gallon price = Price at pump - Station rewards - Uber cashback (per gallon) - Upside cashback
Net per-gallon price = ${pricePump.toFixed(2)} - ${stationRewards.toFixed(2)} - ${uberCashbackPerGallon.toFixed(2)} - ${upsideCashback.toFixed(2)} = $${netPerGallon.toFixed(3)}
Gallons = Target total / Net per-gallon price = ${targetTotal.toFixed(2)} / ${netPerGallon.toFixed(3)} = ${gallons.toFixed(3)}
Amount to pay at pump = Gallons × Price at pump = ${gallons.toFixed(3)} × ${pricePump.toFixed(2)} = $${amountAtPump.toFixed(2)}
Uber cashback = Amount at pump × Uber % = $${amountAtPump.toFixed(2)} × ${uberCashbackPercent.toFixed(2)}% = $${uberCashbackActual.toFixed(2)}
Upside cashback = Gallons × Upside per gallon = ${gallons.toFixed(3)} × ${upsideCashback.toFixed(2)} = $${upsideCashbackActual.toFixed(2)}
Station rewards = Gallons × Station rewards per gallon = ${gallons.toFixed(3)} × ${stationRewards.toFixed(2)} = $${stationRewardsTotal.toFixed(2)}
Final effective per-gallon price = (Amount at pump - Uber cashback - Upside cashback - Station rewards) / Gallons = ($${amountAtPump.toFixed(2)} - $${uberCashbackActual.toFixed(2)} - $${upsideCashbackActual.toFixed(2)} - $${stationRewardsTotal.toFixed(2)}) / ${gallons.toFixed(3)} = $${finalPerGallon.toFixed(3)}
            </pre>
        `;
        resultsSection.style.display = 'block';
    });
// Helper to create summary stat styled like groceries
function createSummaryStat(label, value, isTotal) {
    const wrapper = document.createElement('div');
    wrapper.className = 'summary-stat';
    const labelEl = document.createElement('span');
    labelEl.className = 'summary-label';
    labelEl.textContent = label;
    const valueEl = document.createElement('div');
    valueEl.className = `summary-value${isTotal ? ' total' : ''}`;
    // Format value: if it's a number, show as $X.XX for money, else as-is
    if (typeof value === 'string' && value.match(/^\$?\d+(\.\d+)?$/)) {
        valueEl.textContent = value.startsWith('$') ? value : `$${value}`;
    } else if (typeof value === 'number') {
        valueEl.textContent = isTotal ? `$${value.toFixed(2)}` : value;
    } else {
        valueEl.textContent = value;
    }
    wrapper.appendChild(labelEl);
    wrapper.appendChild(valueEl);
    return wrapper;
}

    form.addEventListener('reset', function() {
        resultsSection.style.display = 'none';
        resultsContent.innerHTML = '';
        document.getElementById('gas-summary-card').style.display = 'none';
        document.getElementById('results-card').style.display = 'none';
        document.getElementById('actuals-card').style.display = 'none';
        document.getElementById('actuals-results-card').style.display = 'none';
        // Clear localStorage
        localStorage.removeItem(STORAGE_KEY);
    });
});
