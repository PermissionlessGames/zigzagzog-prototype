const Circle = ({...props}) => (
<svg width="200px" height="200px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke={props.stroke ?? 'white'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
</svg>
);

export default Circle; 