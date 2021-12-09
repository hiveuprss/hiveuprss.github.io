# create pizzabot.json


import sqlite3
import json
SQLITE_DATABASE_FILE = 'pizzabot.db'
db_conn = sqlite3.connect(SQLITE_DATABASE_FILE)
c = db_conn.cursor()

c.execute('select invoker, recipient, count(*) as gift_count from pizza_bot_gifts group by invoker,recipient')
rows = c.fetchall()

print('%d tips' % len(rows))

links = []
nodes = {}
for row in rows:
    iName = 'i.'+row[0]
    rName = 'r.'+row[1]

    links.append({
        "source": iName,
        "target": rName,
        "value":row[2]})



    nodes[iName] = {"id": iName, "group":"invoker", "radius":2}
    nodes[rName] = {"id": rName, "group":"recipient", "radius":2}



data = {"nodes": list(nodes.values()), "links": links}

with open('pizzabot.json', 'w') as outfile:
    outfile.write(json.dumps(data))