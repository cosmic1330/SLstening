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