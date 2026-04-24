import urllib.request
import json
import datetime

symbol = "4771.TW"
url = f'https://tw.stock.yahoo.com/_td-stock/api/resource/FinanceChartService.ApacLibraCharts;symbols=["{symbol}"];type=tick'
headers = {'User-Agent': 'Mozilla/5.0'}

req = urllib.request.Request(url, headers=headers)
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())

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
    print(f"First timestamp: {timestamp[0]} ({datetime.datetime.fromtimestamp(timestamp[0])})")
    print(f"Last timestamp: {timestamp[-1]} ({datetime.datetime.fromtimestamp(timestamp[-1])})")
    
    # Check for gaps or multiple points per minute
    minutes = [t // 60 for t in timestamp]
    unique_minutes = len(set(minutes))
    print(f"Unique minutes: {unique_minutes}")
    
    # Print first 5 and last 5 points
    for i in range(min(5, len(timestamp))):
        print(f"Index {i}: {datetime.datetime.fromtimestamp(timestamp[i])} -> Price: {indicators['close'][i]}")
    for i in range(max(0, len(timestamp)-5), len(timestamp)):
        print(f"Index {i}: {datetime.datetime.fromtimestamp(timestamp[i])} -> Price: {indicators['close'][i]}")
