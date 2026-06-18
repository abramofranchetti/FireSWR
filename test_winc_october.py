import yfinance as yf
import pandas as pd

# Scarica i dati di WINC.DE attorno al 24 ottobre 2025
df = yf.download('WINC.DE', start='2025-10-20', end='2025-10-31', auto_adjust=False)

print('=== DATI GREZZI DA YAHOO FINANCE ===')
print(df[['Close', 'Adj Close']])
print()
print('=== VERIFICA VALORI ===')
for idx, row in df.iterrows():
    print(f'{idx.date()}: Close={row["Close"]:.4f}, AdjClose={row["Adj Close"]:.4f}')
