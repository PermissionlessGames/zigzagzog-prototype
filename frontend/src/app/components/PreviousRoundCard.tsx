'use client';

interface PreviousRoundCardProps {
  roundNumber: number;
  shapes: {
    circles: number;
    squares: number;
    triangles: number;
    eliminationResult?: string;
  };
}

export function PreviousRoundCard({ roundNumber, shapes }: PreviousRoundCardProps) {
  if (roundNumber <= 1 || !shapes) {
    return null; // Don't show anything if we're in round 1 or no previous data
  }
  
  // Color scheme for eliminated shapes
  const getShapeStyle = (shapeType: string) => {
    const isEliminated = shapes.eliminationResult === shapeType;
    return {
      textAlign: 'center' as const,
      opacity: isEliminated ? 0.5 : 1,
      position: 'relative' as const,
    };
  };
  
  // Get text for elimination result
  const getEliminationText = () => {
    if (!shapes.eliminationResult || shapes.eliminationResult === 'None') {
      return 'No shapes were eliminated';
    }
    return `${shapes.eliminationResult}s were eliminated`;
  };
  
  return (
    <div style={{ 
      marginTop: '1rem',
      padding: '0.75rem',
      backgroundColor: '#f9f9f9',
      border: '1px solid #ddd',
      borderRadius: '0.25rem'
    }}>
      <h4 style={{ 
        marginTop: 0, 
        marginBottom: '0.5rem', 
        fontSize: '0.9rem',
        color: '#666',
        textAlign: 'center'
      }}>
        ROUND {roundNumber - 1} RESULTS
      </h4>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between',
        marginBottom: '0.5rem'
      }}>
        <div style={getShapeStyle('Circle')}>
          <div style={{ fontSize: '1.2rem' }}>●</div>
          <div>{shapes.circles}</div>
          {shapes.eliminationResult === 'Circle' && (
            <div style={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '1.5rem',
              color: '#d32f2f',
              fontWeight: 'bold'
            }}>
              ✗
            </div>
          )}
        </div>
        
        <div style={getShapeStyle('Square')}>
          <div style={{ fontSize: '1.2rem' }}>■</div>
          <div>{shapes.squares}</div>
          {shapes.eliminationResult === 'Square' && (
            <div style={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '1.5rem',
              color: '#d32f2f',
              fontWeight: 'bold'
            }}>
              ✗
            </div>
          )}
        </div>
        
        <div style={getShapeStyle('Triangle')}>
          <div style={{ fontSize: '1.2rem' }}>▲</div>
          <div>{shapes.triangles}</div>
          {shapes.eliminationResult === 'Triangle' && (
            <div style={{ 
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '1.5rem',
              color: '#d32f2f',
              fontWeight: 'bold'
            }}>
              ✗
            </div>
          )}
        </div>
      </div>
      
      <div style={{ 
        fontSize: '0.8rem', 
        textAlign: 'center',
        fontStyle: 'italic',
        color: shapes.eliminationResult === 'None' ? '#333' : '#d32f2f'
      }}>
        {getEliminationText()}
      </div>
    </div>
  );
}