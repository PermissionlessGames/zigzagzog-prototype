export interface ShapeProps {
  type: 'circle' | 'square' | 'triangle' | 'diamond';
  isActive?: boolean;
}

export function Shape({ type, isActive = false }: ShapeProps) {
  const style = {
    display: 'inline-block',
    fontSize: '2rem',
    fontWeight: isActive ? 'bold' : 'normal',
    color: isActive ? '#0070f3' : '#333'
  };

  let symbol = '';
  
  switch (type) {
    case 'circle':
      symbol = '●';
      break;
    case 'square':
      symbol = '■';
      break;
    case 'triangle':
      symbol = '▲';
      break;
    case 'diamond':
      symbol = '◆';
      break;
    default:
      return null;
  }

  return <span style={style}>{symbol}</span>;
}