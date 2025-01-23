import { useContext, useEffect } from "react";
import { DatabaseContext } from "../../../context/DatabaseContext";
import generateSqlQuery from "../../../utils/generateSqlQuery";

export default function TestList() {
  const { db } = useContext(DatabaseContext);

  useEffect(() => {
    // 客製化條件
    const customConditions = [
      "today_sk.k > today_sk.d", // 今天 K > D (黄金交叉)
      "yesterday_sk.k < yesterday_sk.d", // 昨天 K < D
      "today.c > today_sk.ma5", // 收盘价在 5 日均线之上
      "today_sk.ma5 > today_sk.ma20", // 5 日均线大于 20 日均线
      "today_sk.k < 50",
      "today.v > yesterday.v", // 今日成交量大于昨日
    ];

    // 動態生成查詢語句
    const sqlQuery = generateSqlQuery({
      todayDate: "now", // 可以動態設定今天日期
      conditions: customConditions,
    });
    db?.select(sqlQuery).then((res) => console.log(res)).catch((e) => console.error(e));
  }, [db]);

  return <div>TestList</div>;
}
