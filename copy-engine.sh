#!/bin/bash
# Run this from the finmodel-static directory to copy engine files
# from your main finmodel app (adjust the path if needed)
MAIN_ENGINE="../finmodel/engine"

if [ ! -d "$MAIN_ENGINE" ]; then
  echo "Error: Cannot find main engine at $MAIN_ENGINE"
  echo "Please adjust the MAIN_ENGINE path in this script."
  exit 1
fi

cp "$MAIN_ENGINE/runner.py"                          public/engine/runner.py
cp "$MAIN_ENGINE/models/assumptions.py"             public/engine/models/assumptions.py
cp "$MAIN_ENGINE/compute/formula.py"                 public/engine/compute/formula.py
cp "$MAIN_ENGINE/compute/capex.py"                  public/engine/compute/capex.py
cp "$MAIN_ENGINE/compute/debt.py"                   public/engine/compute/debt.py
cp "$MAIN_ENGINE/compute/drivers.py"                public/engine/compute/drivers.py
cp "$MAIN_ENGINE/compute/income_statement.py"       public/engine/compute/income_statement.py
cp "$MAIN_ENGINE/compute/tax.py"                    public/engine/compute/tax.py
cp "$MAIN_ENGINE/compute/balance_sheet.py"          public/engine/compute/balance_sheet.py
cp "$MAIN_ENGINE/compute/cashflow.py"               public/engine/compute/cashflow.py
cp "$MAIN_ENGINE/compute/metrics.py"                public/engine/compute/metrics.py

echo "Engine files copied successfully."
