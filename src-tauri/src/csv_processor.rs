use crate::models::DataEntity;
use csv::Writer;
use std::fmt;
use std::path::Path;

#[derive(Debug)]
pub enum CsvError {
    WriteError(csv::Error),
    IoError(std::io::Error),
    InvalidDataType,
}

impl fmt::Display for CsvError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            CsvError::WriteError(e) => write!(f, "CSV 寫入錯誤: {}", e),
            CsvError::IoError(e) => write!(f, "IO 錯誤: {}", e),
            CsvError::InvalidDataType => write!(f, "無效的數據類型"),
        }
    }
}

impl std::error::Error for CsvError {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            CsvError::WriteError(e) => Some(e),
            CsvError::IoError(e) => Some(e),
            CsvError::InvalidDataType => None,
        }
    }
}

impl From<csv::Error> for CsvError {
    fn from(err: csv::Error) -> Self {
        CsvError::WriteError(err)
    }
}

impl From<std::io::Error> for CsvError {
    fn from(err: std::io::Error) -> Self {
        CsvError::IoError(err)
    }
}

pub fn write_entities_to_csv(entities: &[DataEntity], path: &Path) -> Result<(), CsvError> {
    if entities.is_empty() {
        return Err(CsvError::InvalidDataType);
    }

    match &entities[0] {
        DataEntity::Deal(_) => write_deal_csv(entities, path),
        DataEntity::Skills(_) => write_skills_csv(entities, path)
    }
}

fn write_deal_csv(entities: &[DataEntity], path: &Path) -> Result<(), CsvError> {
    let mut writer = Writer::from_path(path)?;
    
    writer.write_record(&["stock_id", "t", "c", "o", "h", "l", "v"])?;
    
    for entity in entities {
        if let DataEntity::Deal(deal) = entity {
            writer.write_record(&[
                deal.stock_id.clone(),
                deal.t.clone(),
                deal.c.to_string(),
                deal.o.to_string(),
                deal.h.to_string(),
                deal.l.to_string(),
                deal.v.to_string(),
            ])?;
        }
    }
    
    writer.flush()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Deal, Skills};
    use tempfile::NamedTempFile;

    #[test]
    fn test_write_deal_entities_to_csv() {
        let temp_file = NamedTempFile::new().unwrap();
        let path = temp_file.path();

        let deals = vec![
            DataEntity::Deal(Deal {
                stock_id: "2330".to_string(),
                t: "20240101".to_string(),
                c: 100.0,
                o: 99.0,
                h: 101.0,
                l: 98.0,
                v: 1000,
            }),
        ];

        let result = write_entities_to_csv(&deals, path);
        assert!(result.is_ok());

        let content = std::fs::read_to_string(path).unwrap();
        assert!(content.contains("stock_id,t,c,o,h,l,v"));
        assert!(content.contains("2330,20240101,100,99,101,98,1000"));
    }

    #[test]
    fn test_write_skills_entities_to_csv() {
        let temp_file = NamedTempFile::new().unwrap();
        let path = temp_file.path();

        let skills = vec![
            DataEntity::Skills(Skills {
                stock_id: "2330".to_string(),
                t: "20240101".to_string(),
                ma5: 100.0,
                ma5_ded: 99.0,
                ma10: 101.0,
                ma10_ded: 98.0,
                ma20: 102.0,
                ma20_ded: 97.0,
                ma60: 103.0,
                ma60_ded: 96.0,
                ma120: 104.0,
                ma120_ded: 95.0,
                macd: 1.0,
                dif: 0.5,
                osc: 0.5,
                k: 50.0,
                d: 50.0,
                j: Some(50.0),
                rsi5: 60.0,
                rsi10: 55.0,
                boll_ub: 110.0,
                boll_ma: 100.0,
                boll_lb: 90.0,
                obv: 10000.0,
                obv5: 9000.0,
            }),
        ];

        let result = write_entities_to_csv(&skills, path);
        assert!(result.is_ok());

        let content = std::fs::read_to_string(path).unwrap();
        assert!(content.contains("stock_id,t,ma5,ma5_ded,ma10,ma10_ded,ma20,ma20_ded,ma60,ma60_ded,ma120,ma120_ded,macd,dif,osc,k,d,rsi5,rsi10,bollUb,bollMa,bollLb,obv,obv5"));
    }

    #[test]
    fn test_write_empty_entities_returns_error() {
        let temp_file = NamedTempFile::new().unwrap();
        let path = temp_file.path();
        let empty: Vec<DataEntity> = vec![];
        let result = write_entities_to_csv(&empty, path);
        assert!(result.is_err());
    }

    #[test]
    fn test_csv_error_formatting() {
        let invalid_err = CsvError::InvalidDataType;
        assert_eq!(format!("{}", invalid_err), "無效的數據類型");

        let io_err = CsvError::IoError(std::io::Error::new(std::io::ErrorKind::NotFound, "not found"));
        assert_eq!(format!("{}", io_err), "IO 錯誤: not found");
        
        use std::error::Error;
        assert!(invalid_err.source().is_none());
        assert!(io_err.source().is_some());
    }
}

fn write_skills_csv(entities: &[DataEntity], path: &Path) -> Result<(), CsvError> {
    let mut writer = Writer::from_path(path)?;
    
    writer.write_record(&[
        "stock_id", "t", "ma5", "ma5_ded", "ma10", "ma10_ded", "ma20", "ma20_ded", 
        "ma60", "ma60_ded", "ma120", "ma120_ded", "macd", "dif", "osc", "k", "d", 
        "rsi5", "rsi10", "bollUb", "bollMa", "bollLb", "obv", "obv5"
    ])?;
    
    for entity in entities {
        if let DataEntity::Skills(skills) = entity {
            writer.write_record(&[
                skills.stock_id.clone(),
                skills.t.clone(),
                skills.ma5.to_string(),
                skills.ma5_ded.to_string(),
                skills.ma10.to_string(),
                skills.ma10_ded.to_string(),
                skills.ma20.to_string(),
                skills.ma20_ded.to_string(),
                skills.ma60.to_string(),
                skills.ma60_ded.to_string(),
                skills.ma120.to_string(),
                skills.ma120_ded.to_string(),
                skills.macd.to_string(),
                skills.dif.to_string(),
                skills.osc.to_string(),
                skills.k.to_string(),
                skills.d.to_string(),
                skills.rsi5.to_string(),
                skills.rsi10.to_string(),
                skills.boll_ub.to_string(),
                skills.boll_ma.to_string(),
                skills.boll_lb.to_string(),
                skills.obv.to_string(),
                skills.obv5.to_string(),
            ])?;
        }
    }
    
    writer.flush()?;
    Ok(())
}