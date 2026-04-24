import requests
import json

url = 'https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;symbols=["2330.TW"];type=tick'
headers = {'User-Agent': 'Mozilla/5.0'}
response = requests.get(url, headers=headers)
data = response.json()

# Print keys and some data to understand structure
if isinstance(data, list):
    item = data[0]
else:
    item = data

chart = item.get('chart', {})
result = chart.get('result', [{}])[0]
meta = result.get('meta', {})
timestamp = result.get('timestamp', [])
indicators = result.get('indicators', {}).get('quote', [{}])[0]

print(f"Symbol: {meta.get('symbol')}")
print(f"Timestamp count: {len(timestamp)}")
print(f"Close count: {len(indicators.get('close', []))}")
if timestamp:
    print(f"First timestamp: {timestamp[0]}")
    print(f"Last timestamp: {timestamp[-1]}")
    import datetime
    dt_first = datetime.datetime.fromtimestamp(timestamp[0])
    dt_last = datetime.datetime.fromtimestamp(timestamp[-1])
    print(f"First time: {dt_first}")
    print(f"Last time: {dt_last}")
